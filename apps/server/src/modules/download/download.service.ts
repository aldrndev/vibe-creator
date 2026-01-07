import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { env } from "@/config/env";
import { join } from "path";
import { existsSync, mkdir } from "fs";
import { promisify } from "util";
import { randomUUID } from "crypto";

import { detectPlatform, isDirectVideoUrl, isSoraUrl } from "./download.utils";
import { downloadMetadataService } from "./services/download.metadata.service";
import { downloadCobaltService } from "./services/download.cobalt.service";
import { downloadYtDlpService } from "./services/download.ytdlp.service";
import { downloadDirectService } from "./services/download.direct.service";
import { downloadSoraService } from "./services/download.sora.service";

const mkdirAsync = promisify(mkdir);
const DOWNLOADS_DIR = join(env.MEDIA_INPUT_DIR, "downloads");

// Ensure downloads directory exists
async function ensureDownloadsDir() {
  if (!existsSync(DOWNLOADS_DIR)) {
    await mkdirAsync(DOWNLOADS_DIR, { recursive: true });
  }
}

interface CreateDownloadJobInput {
  userId: string;
  sourceUrl: string;
}

/**
 * Download service facade
 * Orchestrates fetching metadata and downloading content via specialized providers
 */
export const downloadService = {
  /**
   * Get video metadata (duration, title) without downloading
   */
  async getVideoMetadata(
    url: string
  ): Promise<{ duration: number; title: string; size?: number }> {
    return downloadMetadataService.getVideoMetadata(url);
  },

  /**
   * Create a new download job
   */
  async createJob(input: CreateDownloadJobInput) {
    const { userId, sourceUrl } = input;

    // Check rate limit (max 5 pending downloads per user)
    const pendingJobs = await prisma.downloadJob.count({
      where: {
        userId,
        status: {
          in: ["PENDING", "DOWNLOADING"],
        },
      },
    });

    if (pendingJobs >= 5) {
      throw new Error(
        "Too many pending downloads. Please wait for current downloads to complete."
      );
    }

    const platform = detectPlatform(sourceUrl);

    const job = await prisma.downloadJob.create({
      data: {
        userId,
        sourceUrl,
        platform,
        status: "PENDING",
      },
    });

    // Start processing in background
    this.processJob(job.id).catch((err) => {
      logger.error({ err, jobId: job.id }, "Download job failed");
    });

    return job;
  },

  /**
   * Get job status
   */
  async getJobStatus(jobId: string, userId: string) {
    const job = await prisma.downloadJob.findFirst({
      where: {
        id: jobId,
        userId,
      },
    });

    if (!job) {
      throw new Error("Download job not found");
    }

    return {
      id: job.id,
      status: job.status,
      platform: job.platform,
      title: job.title,
      sourceUrl: job.sourceUrl,
      localPath: job.localPath,
      errorMessage: job.errorMessage,
      completedAt: job.completedAt,
    };
  },

  /**
   * Delete a download job and its file
   */
  async deleteJob(jobId: string, userId: string) {
    const job = await prisma.downloadJob.findFirst({
      where: {
        id: jobId,
        userId,
      },
    });

    if (!job) {
      // Job already deleted or not found - treat as success
      logger.info({ jobId }, "Job already deleted or not found");
      return { deleted: true };
    }

    // Delete file if exists
    if (job.localPath && existsSync(job.localPath)) {
      const { unlink } = await import("fs/promises");
      try {
        await unlink(job.localPath);
        logger.info(
          { jobId, localPath: job.localPath },
          "Deleted download file"
        );
      } catch (err) {
        logger.warn({ jobId, err }, "Failed to delete download file");
      }
    }

    // Delete database record
    await prisma.downloadJob.delete({
      where: { id: jobId },
    });

    return { deleted: true };
  },

  /**
   * Generic video download method
   */
  async downloadVideo(
    url: string,
    outputPath: string,
    onProgress?: (percent: number) => void
  ): Promise<{ title: string; metadata: Record<string, unknown> }> {
    // Check if it's a Sora video URL (prioritize Sora handler)
    if (isSoraUrl(url)) {
      logger.info({ url }, "Downloading Sora video via multi-CDN fallback");
      if (onProgress) onProgress(10);
      const res = await downloadSoraService.downloadSoraVideo(url, outputPath);
      if (onProgress) onProgress(100);
      return res;
    }

    // Check if it's a direct video URL
    if (isDirectVideoUrl(url)) {
      logger.info({ url }, "Downloading direct video URL");
      return await downloadDirectService.downloadDirectUrl(
        url,
        outputPath,
        onProgress
      );
    }

    if (env.COBALT_API_URL) {
      // Use self-hosted Cobalt API if configured
      try {
        logger.info(
          { url, cobaltUrl: env.COBALT_API_URL },
          "Downloading with Cobalt API"
        );
        return await downloadCobaltService.runCobalt(
          url,
          outputPath,
          onProgress
        );
      } catch (cobaltError) {
        // Fallback to yt-dlp if Cobalt fails
        logger.warn(
          {
            error:
              cobaltError instanceof Error ? cobaltError.message : "Unknown",
          },
          "Cobalt failed, falling back to yt-dlp"
        );
        return await downloadYtDlpService.runYtDlp(url, outputPath, onProgress);
      }
    }

    // No Cobalt configured, use yt-dlp directly
    logger.info({ url }, "Downloading with yt-dlp");
    return await downloadYtDlpService.runYtDlp(url, outputPath, onProgress);
  },

  /**
   * Process download job - try Cobalt first, then yt-dlp
   */
  async processJob(jobId: string) {
    await ensureDownloadsDir();

    // Update status to downloading
    await prisma.downloadJob.update({
      where: { id: jobId },
      data: { status: "DOWNLOADING" },
    });

    try {
      const job = await prisma.downloadJob.findUnique({
        where: { id: jobId },
      });

      if (!job) {
        throw new Error("Job not found");
      }

      const outputId = randomUUID();
      const outputPath = join(DOWNLOADS_DIR, `${outputId}.mp4`);

      let result: { title: string; metadata: Record<string, unknown> };

      result = await this.downloadVideo(job.sourceUrl, outputPath);

      // Mark as completed
      await prisma.downloadJob.update({
        where: { id: jobId },
        data: {
          status: "COMPLETED",
          title: result.title,
          localPath: outputPath,
          metadata: result.metadata as Record<string, string>,
          completedAt: new Date(),
        },
      });

      logger.info({ jobId, output: outputPath }, "Download completed");
    } catch (err) {
      logger.error({ err, jobId }, "Download processing failed");

      // Delete the failed record - only successful downloads are kept
      await prisma.downloadJob.delete({
        where: { id: jobId },
      });

      logger.info({ jobId }, "Deleted failed download job");
    }
  },

  /**
   * Get download history for a user
   */
  async getHistory(userId: string) {
    const jobs = await prisma.downloadJob.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20, // Limit to last 20 downloads
    });

    return jobs.map((job) => ({
      id: job.id,
      status: job.status,
      platform: job.platform,
      title: job.title,
      sourceUrl: job.sourceUrl,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
    }));
  },
};
