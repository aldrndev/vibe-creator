import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import {
  DirectorStep,
  DirectorJobStatus,
  DirectorAssetOrigin,
  DirectorIngestStatus,
} from "@prisma/client";
import { randomUUID } from "crypto";
import { directorQueue } from "./director.queue";
import { mkdir, stat, unlink, copyFile } from "fs/promises";
import { join } from "path";
import { downloadService } from "../download/download.service";
import { existsSync } from "fs";

import { directorProcessor } from "./director.processor";
import { env } from "@/config/env";

// =============================================================================
// URL VALIDATION (SSRF Protection)
// =============================================================================

const ALLOWED_HOSTS = [
  "youtube.com",
  "www.youtube.com",
  "youtu.be",
  "tiktok.com",
  "www.tiktok.com",
  "vm.tiktok.com",
  "instagram.com",
  "www.instagram.com",
  "facebook.com",
  "www.facebook.com",
  "fb.watch",
];

function validateImportUrl(url: string): {
  valid: boolean;
  normalized?: string;
} {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();

    if (!ALLOWED_HOSTS.some((h) => host === h || host.endsWith("." + h))) {
      return { valid: false };
    }

    // Normalize URL (keep query params for YouTube v=, but maybe strip known tracking if we wanted)
    // For now, just keep search params to ensure YouTube /watch?v= works
    const normalized = `${parsed.protocol}//${parsed.host}${parsed.pathname}${parsed.search}`;
    return { valid: true, normalized };
  } catch {
    return { valid: false };
  }
}

// =============================================================================
// SERVICE
// =============================================================================

export const directorService = {
  /**
   * Create a new director session
   */
  async createSession(userId: string) {
    const session = await prisma.directorSession.create({
      data: {
        userId,
        step: DirectorStep.IMPORT,
      },
    });

    logger.info({ sessionId: session.id, userId }, "Director session created");
    return session;
  },

  /**
   * Get session with ownership check
   */
  async getSession(sessionId: string, userId: string) {
    const session = await prisma.directorSession.findFirst({
      where: { id: sessionId, userId },
      include: {
        asset: true,
        analysisJob: {
          include: {
            candidates: {
              orderBy: { rank: "asc" },
            },
          },
        },
        selectedClips: {
          include: {
            candidate: true,
            transcript: true,
          } as any,
          orderBy: { orderIndex: "asc" },
        },
        transcribeJob: true,
        subtitleStyle: true,
        exportJob: true,
      },
    });

    if (!session) {
      throw new Error("Session not found or not authorized");
    }

    return session;
  },

  /**
   * Delete session with cleanup
   */
  async deleteSession(sessionId: string, userId: string) {
    const session = await prisma.directorSession.findFirst({
      where: { id: sessionId, userId },
    });

    if (!session) {
      throw new Error("Session not found");
    }

    // TODO: Clean up storage files

    await prisma.directorSession.delete({
      where: { id: sessionId },
    });

    logger.info({ sessionId }, "Director session deleted");
    return { deleted: true };
  },

  /**
   * Import video from URL
   */
  /**
   * Import video from URL or File
   */
  async importAsset(
    sessionId: string,
    userId: string,
    input: { type: "url" | "file"; url?: string; filePath?: string }
  ) {
    // Validate ownership
    const session = await prisma.directorSession.findFirst({
      where: { id: sessionId, userId },
    });

    if (!session) {
      throw new Error("Session not found or not authorized");
    }

    // Check if already has asset
    const existingAsset = await prisma.directorAsset.findUnique({
      where: { sessionId },
    });

    if (existingAsset) {
      if (existingAsset.ingestStatus === DirectorIngestStatus.FAILED) {
        // Cleanup failed asset to allow retry
        await prisma.directorAsset.delete({ where: { id: existingAsset.id } });
      } else {
        throw new Error(
          "Session already has an asset. Delete and recreate session."
        );
      }
    }

    // Handle URL Import
    if (input.type === "url" && input.url) {
      // Validate URL
      const { valid, normalized } = validateImportUrl(input.url);
      if (!valid) {
        throw new Error(
          "URL not supported. Use YouTube, TikTok, Instagram, or Facebook."
        );
      }

      if (!normalized) {
        throw new Error("Invalid URL normalization");
      }

      // SMART VALIDATION: Check metadata before download (Intelligence Upgrade)
      const meta = await downloadService.getVideoMetadata(normalized);

      const maxDurationSec = env.MAX_VIDEO_DURATION_MS / 1000;
      if (meta.duration > maxDurationSec + 10) {
        // 10s tolerance
        throw new Error(
          `Video is too long (${Math.round(
            meta.duration / 60
          )}m). Limit is ${Math.round(maxDurationSec / 60)}m.`
        );
      }

      if (meta.size && meta.size > env.MAX_UPLOAD_SIZE_MB * 1024 * 1024) {
        throw new Error(
          `Video is too large (~${Math.round(
            meta.size / 1024 / 1024
          )}MB). Limit is ${env.MAX_UPLOAD_SIZE_MB}MB.`
        );
      }

      // Create asset record (will be filled by download job)
      const assetId = randomUUID();
      const storageKey = `uploads/director/${assetId}.mp4`; // Consistent with file import

      const asset = await prisma.directorAsset.create({
        data: {
          sessionId,
          storageKey,
          origin: DirectorAssetOrigin.URL_IMPORT,
          sourceUrlNormalized: normalized,
          ingestStatus: DirectorIngestStatus.UPLOADING,
          mimeType: "video/mp4",
          sizeBytes: BigInt(0),
        },
      });

      // Trigger background download
      this.triggerUrlDownload(asset.id, storageKey, normalized).catch((err) => {
        logger.error({ err, sessionId }, "Background download failed");
      });

      logger.info(
        { sessionId, url: normalized },
        "Director asset import (URL) started"
      );
      return asset;
    }

    // Handle File Import
    if (input.type === "file" && input.filePath) {
      // Verify temp file exists
      if (!existsSync(input.filePath)) {
        throw new Error("Uploaded file not found");
      }

      // Prepare destination
      const assetId = randomUUID();
      const storageKey = `uploads/director/${assetId}.mp4`;

      // We assume local storage for now, mirroring the key structure
      // Real prod would upload to S3 here
      const uploadsDir = join(env.MEDIA_INPUT_DIR, "director");
      if (!existsSync(uploadsDir)) {
        await mkdir(uploadsDir, { recursive: true });
      }

      const destPath = join(uploadsDir, `${assetId}.mp4`);

      // Copy file then delete original (cross-filesystem compatible)
      await copyFile(input.filePath, destPath);
      await unlink(input.filePath);

      // Create asset record
      const asset = await prisma.directorAsset.create({
        data: {
          sessionId,
          storageKey, // In a real app this would be s3 key. Here it maps to uploads/director/{uuid}.mp4
          origin: DirectorAssetOrigin.UPLOAD,
          ingestStatus: DirectorIngestStatus.READY,
          mimeType: "video/mp4",
          sizeBytes: BigInt(0), // We should get size from fs.stat but skipping for brevity
        },
      });

      logger.info(
        { sessionId, filePath: destPath },
        "Director asset import (File) completed"
      );
      return asset;
    }

    throw new Error("Invalid import input");
  },

  /**
   * Get asset for session
   */
  async getAsset(sessionId: string, userId: string) {
    const session = await prisma.directorSession.findFirst({
      where: { id: sessionId, userId },
      include: { asset: true },
    });

    if (!session || !session.asset) {
      throw new Error("Asset not found");
    }

    return session.asset;
  },

  /**
   * Start analysis job
   */
  async startAnalysis(sessionId: string, userId: string) {
    const session = await prisma.directorSession.findFirst({
      where: { id: sessionId, userId },
      include: { asset: true, analysisJob: true },
    });

    if (!session) {
      throw new Error("Session not found");
    }

    if (
      !session.asset ||
      session.asset.ingestStatus !== DirectorIngestStatus.READY
    ) {
      throw new Error("Asset not ready for analysis");
    }

    // Check if already has analysis job
    if (session.analysisJob) {
      return session.analysisJob;
    }

    const idempotencyKey = `${sessionId}:analyze:v1`;

    // Create analysis job
    const job = await prisma.directorAnalysisJob.create({
      data: {
        sessionId,
        idempotencyKey,
        status: DirectorJobStatus.PENDING,
        config: {
          silenceThreshold: -30,
          silenceMinDuration: 0.5,
          sceneChangeThreshold: 0.4,
          minClipDuration: 5000,
          maxClipDuration: 35000,
          maxCandidates: 20,
        },
      },
    });

    // Update session step
    await prisma.directorSession.update({
      where: { id: sessionId },
      data: { step: DirectorStep.ANALYZING },
    });

    // Resolve absolute path (Docker-safe)
    const fileName = session.asset.storageKey.split("/").pop()!;
    const filePath = join(env.MEDIA_INPUT_DIR, "director", fileName);

    // GATE: Minimum Duration Check (Smart AI)
    // Only analyze videos > 5 minutes (300s). AI Director is for Long-form -> Short-form.
    const { duration } = await directorProcessor.getVideoMetadata(filePath);
    if (duration > 0 && duration < 300) {
      // Revert status
      await prisma.directorSession.update({
        where: { id: sessionId },
        data: { step: DirectorStep.IMPORT },
      });
      throw new Error(
        "Video terlalu pendek (< 5 menit). AI Director dirancang untuk konten durasi panjang (minimal 5 menit)."
      );
    }

    // Add to BullMQ
    await directorQueue.add(
      "analyze",
      {
        type: "ANALYSIS",
        sessionId,
        assetId: session.asset.id,
        filePath,
        userId: session.userId,
      },
      {
        jobId: `director:analyze:${sessionId}`, // Idempotency
        removeOnComplete: true,
        removeOnFail: false,
      }
    );

    logger.info({ sessionId, jobId: job.id }, "Director analysis job enqueued");

    return job;
  },

  /**
   * Get analysis result
   */
  async getAnalysisResult(sessionId: string, userId: string) {
    const session = await prisma.directorSession.findFirst({
      where: { id: sessionId, userId },
      include: {
        analysisJob: {
          include: {
            candidates: {
              orderBy: { rank: "asc" },
            },
          },
        },
      },
    });

    if (!session || !session.analysisJob) {
      throw new Error("Analysis not found");
    }

    return session.analysisJob;
  },

  /**
   * Select clips from candidates
   */
  async selectClips(sessionId: string, userId: string, candidateIds: string[]) {
    const session = await prisma.directorSession.findFirst({
      where: { id: sessionId, userId },
      include: {
        analysisJob: {
          include: { candidates: true },
        },
      },
    });

    if (!session) {
      throw new Error("Session not found");
    }

    if (
      !session.analysisJob ||
      session.analysisJob.status !== DirectorJobStatus.COMPLETED
    ) {
      throw new Error("Analysis not completed");
    }

    // Validate candidate IDs
    const validCandidateIds = session.analysisJob.candidates.map((c) => c.id);
    const invalidIds = candidateIds.filter(
      (id) => !validCandidateIds.includes(id)
    );
    if (invalidIds.length > 0) {
      throw new Error(`Invalid candidate IDs: ${invalidIds.join(", ")}`);
    }

    // Clear existing selections
    await prisma.directorSelectedClip.deleteMany({
      where: { sessionId },
    });

    // Create new selections
    const clips = await prisma.$transaction(
      candidateIds.map((candidateId, index) =>
        prisma.directorSelectedClip.create({
          data: {
            sessionId,
            candidateId,
            orderIndex: index,
          },
          include: { candidate: true },
        })
      )
    );

    // Update session step
    await prisma.directorSession.update({
      where: { id: sessionId },
      data: { step: DirectorStep.EDITING },
    });

    logger.info({ sessionId, clipCount: clips.length }, "Clips selected");
    return clips;
  },

  /**
   * Get selected clips
   */
  async getSelectedClips(sessionId: string, userId: string) {
    const session = await prisma.directorSession.findFirst({
      where: { id: sessionId, userId },
      include: {
        selectedClips: {
          include: {
            candidate: true,
            transcript: true,
          },
          orderBy: { orderIndex: "asc" },
        },
      },
    });

    if (!session) {
      throw new Error("Session not found");
    }

    // Debug log to check if transcript is present
    logger.info(
      {
        sessionId,
        clipCount: session.selectedClips.length,
        hasTranscript: session.selectedClips.some((c) => !!c.transcript),
      },
      "getSelectedClips: Returning clips"
    );

    return session.selectedClips;
  },

  /**
   * Update a selected clip
   */
  async updateClip(
    sessionId: string,
    userId: string,
    clipId: string,
    updates: { trimStartMs?: number; trimEndMs?: number; orderIndex?: number }
  ) {
    const session = await prisma.directorSession.findFirst({
      where: { id: sessionId, userId },
    });

    if (!session) {
      throw new Error("Session not found");
    }

    const clip = await prisma.directorSelectedClip.findFirst({
      where: { id: clipId, sessionId },
    });

    if (!clip) {
      throw new Error("Clip not found");
    }

    const updated = await prisma.directorSelectedClip.update({
      where: { id: clipId },
      data: updates,
      include: { candidate: true },
    });

    return updated;
  },

  /**
   * Start transcription job
   */
  async startTranscribe(sessionId: string, userId: string) {
    const session = await prisma.directorSession.findFirst({
      where: { id: sessionId, userId },
      include: { selectedClips: true, transcribeJob: true },
    });

    if (!session) {
      throw new Error("Session not found");
    }

    if (session.selectedClips.length === 0) {
      throw new Error("No clips selected");
    }

    let job;

    // Check existing job
    if (session.transcribeJob) {
      const status = session.transcribeJob.status;

      // If active or completed, return existing
      if (
        status === DirectorJobStatus.PENDING ||
        status === DirectorJobStatus.PROCESSING ||
        status === DirectorJobStatus.COMPLETED
      ) {
        return session.transcribeJob;
      }

      // If FAILED, reset and retry
      if (status === DirectorJobStatus.FAILED) {
        logger.info(
          { sessionId, jobId: session.transcribeJob.id },
          "Retrying failed transcribe job"
        );
        job = await prisma.directorTranscribeJob.update({
          where: { id: session.transcribeJob.id },
          data: { status: DirectorJobStatus.PENDING, errorMessage: null },
        });
      } else {
        // Should not happen, but safe fallback
        job = session.transcribeJob;
      }
    } else {
      // Create new job if none exists
      const idempotencyKey = `${sessionId}:transcribe:${Date.now()}`;
      job = await prisma.directorTranscribeJob.create({
        data: {
          sessionId,
          idempotencyKey,
          status: DirectorJobStatus.PENDING,
          engine: "WHISPER_LOCAL",
        },
      });
    }

    // Queue BullMQ job using DB Job ID as unique identifier for this attempt
    // We append timestamp if it's a retry to ensure a fresh queue ID if needed,
    // but usually unique is better. Let's use `director:transcribe:${job.id}`
    // If we are reusing the DB job, we might need a suffix if the header job stuck.
    // But `removeOnComplete` is true. `removeOnFail` default false.
    // So if failed, it stays. We should probably use a unique suffix for the QUEUE job ID.
    const queueJobId = `director:transcribe:${job.id}:${Date.now()}`;

    await directorQueue.add(
      "transcribe_session",
      {
        type: "TRANSCRIBE_SESSION",
        sessionId,
        userId,
      },
      {
        jobId: queueJobId,
        removeOnComplete: true,
      }
    );

    logger.info(
      { sessionId, jobId: job.id, queueJobId },
      "Director transcribe job created and queued"
    );

    return job;
  },

  /**
   * Background download helper
   */
  /**
   * Background download helper
   */
  async triggerUrlDownload(assetId: string, storageKey: string, url: string) {
    try {
      // Use env.MEDIA_INPUT_DIR which is correctly mapped (e.g. /app/uploads in Docker)
      const uploadsDir = join(env.MEDIA_INPUT_DIR, "director");
      if (!existsSync(uploadsDir)) {
        await mkdir(uploadsDir, { recursive: true });
      }

      // storageKey might be "uploads/director/xxx.mp4"
      // We want to save to "/app/uploads/director/xxx.mp4"
      // So we strip the prefix if it exists in the key, or just use basename
      // But verify that storageKey matches our expectation

      const fileName = storageKey.split("/").pop()!;
      const outputPath = join(uploadsDir, fileName);

      logger.info({ assetId, url, outputPath }, "Starting background download");

      // Progress Key: director:asset:{assetId}:progress
      const progressKey = `director:asset:${assetId}:progress`;

      // Set initial progress immediately so frontend sees movement
      const { redis } = await import("@/lib/redis");
      await redis.set(progressKey, 5, "EX", 300);
      logger.info({ assetId, progressKey }, "Set initial progress to 5%");

      // Throttle progress updates (max once per 500ms to avoid Redis overload)
      let lastProgressTime = Date.now();
      let lastProgress = 5;

      await downloadService.downloadVideo(url, outputPath, async (percent) => {
        const now = Date.now();
        const roundedPercent = Math.round(percent);

        logger.debug(
          { assetId, roundedPercent, lastProgress, lastProgressTime },
          "Download progress callback invoked"
        );

        // Only update if: 500ms passed OR progress jumped 10%+ OR finished
        if (
          now - lastProgressTime > 500 ||
          roundedPercent - lastProgress >= 10 ||
          roundedPercent >= 100
        ) {
          lastProgressTime = now;
          lastProgress = roundedPercent;

          logger.info(
            { assetId, roundedPercent, progressKey },
            "Updating Redis with progress"
          );
          await redis.set(progressKey, roundedPercent, "EX", 300);
        }
      });

      // Get file size
      const fileStats = await stat(outputPath);

      await prisma.directorAsset.update({
        where: { id: assetId },
        data: {
          ingestStatus: DirectorIngestStatus.READY,
          sizeBytes: fileStats.size,
        },
      });

      // Clear progress key or set to 100
      await redis.set(progressKey, 100, "EX", 60);

      logger.info(
        { assetId, size: fileStats.size },
        "Background download completed, asset READY"
      );
    } catch (err) {
      logger.error({ err, assetId }, "Background download failed");
      await prisma.directorAsset.update({
        where: { id: assetId },
        data: {
          ingestStatus: DirectorIngestStatus.FAILED,
        },
      });

      // Set error state in Redis for frontend to see immediately
      const { redis: redisClient } = await import("@/lib/redis");
      await redisClient.set(
        `director:asset:${assetId}:error`,
        (err as Error).message,
        "EX",
        60
      );
    }
  },

  /**
   * Update clip transcript
   */
  async updateClipTranscript(
    sessionId: string,
    userId: string,
    clipId: string,
    segments: any[]
  ) {
    const session = await prisma.directorSession.findFirst({
      where: { id: sessionId, userId },
    });

    if (!session) {
      throw new Error("Session not found");
    }

    const transcript = await (prisma as any).directorClipTranscript.update({
      where: { selectedClipId: clipId },
      data: {
        segments: segments,
        updatedAt: new Date(),
      },
    });

    return transcript;
  },

  /**
   * Get transcription result (Legacy session level + Clips check)
   */
  async getTranscribeResult(sessionId: string, userId: string) {
    const session = await prisma.directorSession.findFirst({
      where: { id: sessionId, userId },
      include: { transcribeJob: true },
    });

    if (!session) {
      throw new Error("Session not found");
    }

    // Return null if no transcribe job yet - frontend should handle this
    return session.transcribeJob || null;
  },

  /**
   * Update subtitle style
   */
  async updateSubtitleStyle(
    sessionId: string,
    userId: string,
    updates: {
      fontToken?: string;
      textColorToken?: string;
      bgColorToken?: string;
      fontSize?: number;
      position?: string;
      animation?: string;
    }
  ) {
    const session = await prisma.directorSession.findFirst({
      where: { id: sessionId, userId },
    });

    if (!session) {
      throw new Error("Session not found");
    }

    const style = await prisma.directorSubtitleStyle.upsert({
      where: { sessionId },
      create: {
        sessionId,
        ...updates,
      },
      update: updates,
    });

    return style;
  },

  /**
   * Start export job
   */
  async startExport(
    sessionId: string,
    userId: string,
    options: {
      aspectRatio?: string;
      quality?: string;
      includeSubtitles?: boolean;
    }
  ) {
    const session = await prisma.directorSession.findFirst({
      where: { id: sessionId, userId },
      include: { selectedClips: true, exportJob: true },
    });

    if (!session) {
      throw new Error("Session not found");
    }

    if (session.selectedClips.length === 0) {
      throw new Error("No clips selected");
    }

    // Return existing job if exists and pending/processing
    if (
      session.exportJob &&
      (session.exportJob.status === DirectorJobStatus.PENDING ||
        session.exportJob.status === DirectorJobStatus.PROCESSING)
    ) {
      return session.exportJob;
    }

    const idempotencyKey = `${sessionId}:export:${Date.now()}`;

    const job = await prisma.directorExportJob.create({
      data: {
        sessionId,
        idempotencyKey,
        status: DirectorJobStatus.PENDING,
        aspectRatio: options.aspectRatio ?? "9:16",
        quality: options.quality ?? "1080p",
        includeSubtitles: options.includeSubtitles ?? true,
      },
    });

    // Update session step
    await prisma.directorSession.update({
      where: { id: sessionId },
      data: { step: DirectorStep.EXPORTING },
    });

    // Queue BullMQ job for export
    await directorQueue.add(
      "export",
      {
        type: "EXPORT",
        sessionId,
        userId,
        options: {
          includeSubtitles: job.includeSubtitles,
          aspectRatio: job.aspectRatio as "9:16" | "16:9" | "1:1",
          quality: job.quality as "720p" | "1080p",
        },
      },
      {
        jobId: `director:export:${job.id}`,
        removeOnComplete: true,
      }
    );

    logger.info({ sessionId, jobId: job.id }, "Director export job queued");

    return job;
  },

  /**
   * Get export result
   */
  async getExportResult(sessionId: string, userId: string) {
    const session = await prisma.directorSession.findFirst({
      where: { id: sessionId, userId },
      include: { exportJob: true },
    });

    if (!session || !session.exportJob) {
      throw new Error("Export not found");
    }

    return session.exportJob;
  },
};
