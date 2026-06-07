import { randomUUID } from 'node:crypto';
import { existsSync, mkdir } from 'node:fs';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { env } from '@/config/env';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { assertSafeUrl } from '@/utils/ssrf';
import { detectPlatform, isDirectVideoUrl, isSoraUrl } from './download.utils';
import { downloadCobaltService } from './services/download.cobalt.service';
import { downloadDirectService } from './services/download.direct.service';
import { downloadMetadataService } from './services/download.metadata.service';
import { downloadSoraService } from './services/download.sora.service';
import { downloadYtDlpService } from './services/download.ytdlp.service';

const mkdirAsync = promisify(mkdir);
const DOWNLOADS_DIR = join(env.MEDIA_INPUT_DIR, 'downloads');

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

export interface DownloadVideoOptions {
  readonly maxBytes?: number;
}

/**
 * Download service facade
 * Orchestrates fetching metadata and downloading content via specialized providers
 */
export const downloadService = {
  /**
   * Get video metadata (duration, title) without downloading
   */
  async getVideoMetadata(url: string): Promise<{ duration: number; title: string; size?: number }> {
    return downloadMetadataService.getVideoMetadata(url);
  },

  /**
   * Create a new download job
   */
  async createJob(input: CreateDownloadJobInput) {
    const { userId, sourceUrl } = input;

    await assertSafeUrl(sourceUrl);

    // Check rate limit (max 5 pending downloads per user)
    const pendingJobs = await prisma.downloadJob.count({
      where: {
        userId,
        status: {
          in: ['PENDING', 'DOWNLOADING'],
        },
      },
    });

    if (pendingJobs >= 5) {
      throw new Error('Too many pending downloads. Please wait for current downloads to complete.');
    }

    const platform = detectPlatform(sourceUrl);

    const job = await prisma.downloadJob.create({
      data: {
        userId,
        sourceUrl,
        platform,
        status: 'PENDING',
      },
    });

    // Start processing in background
    this.processJob(job.id).catch((err) => {
      logger.error({ err, jobId: job.id }, 'Download job failed');
    });

    return job;
  },

  /**
   * Get job status
   */
  async getOwnedJob(jobId: string, userId: string) {
    const job = await prisma.downloadJob.findFirst({
      where: {
        id: jobId,
        userId,
      },
    });

    if (!job) {
      throw new Error('Download job not found');
    }

    return job;
  },

  /**
   * Get job status
   */
  async getJobStatus(jobId: string, userId: string) {
    const job = await this.getOwnedJob(jobId, userId);

    return {
      id: job.id,
      status: job.status,
      platform: job.platform,
      title: job.title,
      sourceUrl: job.sourceUrl,
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
      logger.info({ jobId }, 'Job already deleted or not found');
      return { deleted: true };
    }

    // Delete file if exists
    if (job.localPath && existsSync(job.localPath)) {
      const { unlink } = await import('node:fs/promises');
      try {
        await unlink(job.localPath);
        logger.info({ jobId, localPath: job.localPath }, 'Deleted download file');
      } catch (err) {
        logger.warn({ jobId, err }, 'Failed to delete download file');
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
    onProgress?: (percent: number) => void,
    options?: DownloadVideoOptions,
  ): Promise<{ title: string; metadata: Record<string, unknown> }> {
    // Check if it's a Sora video URL (prioritize Sora handler)
    if (isSoraUrl(url)) {
      logger.info({ url }, 'Downloading Sora video via multi-CDN fallback');
      if (onProgress) onProgress(10);
      const res = await downloadSoraService.downloadSoraVideo(url, outputPath);
      if (onProgress) onProgress(100);
      return res;
    }

    // Check if it's a direct video URL
    if (isDirectVideoUrl(url)) {
      logger.info({ url }, 'Downloading direct video URL');
      return await downloadDirectService.downloadDirectUrl(url, outputPath, onProgress, options);
    }

    if (env.COBALT_API_URL) {
      // Use self-hosted Cobalt API if configured
      try {
        logger.info({ url, cobaltUrl: env.COBALT_API_URL }, 'Downloading with Cobalt API');
        return await downloadCobaltService.runCobalt(url, outputPath, onProgress, options);
      } catch (cobaltError) {
        // Fallback to yt-dlp if Cobalt fails
        logger.warn(
          {
            error: cobaltError instanceof Error ? cobaltError.message : 'Unknown',
          },
          'Cobalt failed, falling back to yt-dlp',
        );
        return await downloadYtDlpService.runYtDlp(url, outputPath, onProgress, options);
      }
    }

    // No Cobalt configured, use yt-dlp directly
    logger.info({ url }, 'Downloading with yt-dlp');
    return await downloadYtDlpService.runYtDlp(url, outputPath, onProgress, options);
  },

  /**
   * Process download job - try Cobalt first, then yt-dlp
   */
  async processJob(jobId: string) {
    await ensureDownloadsDir();

    // Update status to downloading
    await prisma.downloadJob.update({
      where: { id: jobId },
      data: { status: 'DOWNLOADING' },
    });

    try {
      const job = await prisma.downloadJob.findUnique({
        where: { id: jobId },
      });

      if (!job) {
        throw new Error('Job not found');
      }

      const outputId = randomUUID();
      const outputPath = join(DOWNLOADS_DIR, `${outputId}.mp4`);

      const result = await this.downloadVideo(job.sourceUrl, outputPath);

      // Mark as completed
      await prisma.downloadJob.update({
        where: { id: jobId },
        data: {
          status: 'COMPLETED',
          title: result.title,
          localPath: outputPath,
          metadata: result.metadata as Record<string, string>,
          completedAt: new Date(),
        },
      });

      logger.info({ jobId, output: outputPath }, 'Download completed');
    } catch (err) {
      logger.error({ err, jobId }, 'Download processing failed');

      // Delete the failed record - only successful downloads are kept
      await prisma.downloadJob.delete({
        where: { id: jobId },
      });

      logger.info({ jobId }, 'Deleted failed download job');
    }
  },

  /**
   * Get download history for a user with cursor pagination
   */
  async getHistory(userId: string, limit = 20, cursor?: string) {
    let cursorWhere = {};

    // Cursor pagination
    if (cursor) {
      try {
        const decoded = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as {
          id: string;
          ts: string;
        };
        const cursorDate = new Date(decoded.ts);
        cursorWhere = {
          OR: [
            { createdAt: { lt: cursorDate } },
            { createdAt: cursorDate, id: { lt: decoded.id } },
          ],
        };
      } catch {
        // Invalid cursor, ignore
      }
    }

    const [jobs, total] = await Promise.all([
      prisma.downloadJob.findMany({
        where: { userId, ...cursorWhere },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: limit + 1,
      }),
      prisma.downloadJob.count({
        where: { userId },
      }),
    ]);

    const hasMore = jobs.length > limit;
    const items = hasMore ? jobs.slice(0, limit) : jobs;
    const lastItem = items[items.length - 1];
    const nextCursor =
      hasMore && lastItem
        ? Buffer.from(
            JSON.stringify({
              id: lastItem.id,
              ts: lastItem.createdAt.toISOString(),
            }),
          ).toString('base64url')
        : null;

    return {
      items: items.map((job: (typeof jobs)[number]) => ({
        id: job.id,
        status: job.status,
        platform: job.platform,
        title: job.title,
        sourceUrl: job.sourceUrl,
        createdAt: job.createdAt,
        completedAt: job.completedAt,
      })),
      nextCursor,
      hasMore,
      total,
    };
  },
};
