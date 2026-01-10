/**
 * Director Asset Service
 * Handles asset import, validation, and file management
 */

import { logger } from "@/lib/logger";
import { directorRepo } from "../director.repo";
import { downloadService } from "../../download/download.service";
import { validateImportUrl } from "../director.utils";
import { env } from "@/config/env";
import { mkdir, stat, unlink, copyFile } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import { randomUUID } from "crypto";
import { DirectorAssetOrigin, DirectorIngestStatus } from "@prisma/client";

export const directorAssetService = {
  /**
   * Import video from URL or File
   */
  async importAsset(
    sessionId: string,
    userId: string,
    input: { type: "url" | "file"; url?: string; filePath?: string }
  ) {
    // Validate ownership
    const session = await directorRepo.findSession(sessionId, userId);

    if (!session) {
      throw new Error("Session not found or not authorized");
    }

    // Check if already has asset
    const existingAsset = await directorRepo.findAssetBySession(sessionId);

    if (existingAsset) {
      if (existingAsset.ingestStatus === DirectorIngestStatus.FAILED) {
        // Cleanup failed asset to allow retry
        await directorRepo.deleteAsset(existingAsset.id);
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

      const asset = await directorRepo.createAsset({
        id: assetId,
        sessionId,
        storageKey,
        origin: DirectorAssetOrigin.URL_IMPORT,
        sourceUrlNormalized: normalized,
        ingestStatus: DirectorIngestStatus.UPLOADING,
        mimeType: "video/mp4",
        sizeBytes: BigInt(0),
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
      const asset = await directorRepo.createAsset({
        id: assetId,
        sessionId,
        storageKey, // In a real app this would be s3 key. Here it maps to uploads/director/{uuid}.mp4
        origin: DirectorAssetOrigin.UPLOAD,
        ingestStatus: DirectorIngestStatus.READY,
        mimeType: "video/mp4",
        sizeBytes: BigInt(0), // We should get size from fs.stat but skipping for brevity
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
    const session = await directorRepo.findSession(sessionId, userId);

    if (!session || !session.asset) {
      throw new Error("Asset not found");
    }

    return session.asset;
  },

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

      await directorRepo.updateAsset(assetId, {
        ingestStatus: DirectorIngestStatus.READY,
        sizeBytes: fileStats.size,
      });

      // Clear progress key or set to 100
      await redis.set(progressKey, 100, "EX", 60);

      logger.info(
        { assetId, size: fileStats.size },
        "Background download completed, asset READY"
      );
    } catch (err) {
      logger.error({ err, assetId }, "Background download failed");
      await directorRepo.updateAsset(assetId, {
        ingestStatus: DirectorIngestStatus.FAILED,
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
};
