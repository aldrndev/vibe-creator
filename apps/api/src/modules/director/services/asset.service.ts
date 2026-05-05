/**
 * Director Asset Service
 * Handles asset import, validation, and file management
 */

import { createHash, randomUUID } from 'node:crypto';
import { createReadStream, existsSync } from 'node:fs';
import { copyFile, mkdir, stat, unlink } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { DirectorAssetOrigin, DirectorIngestStatus } from '@prisma/client';
import { env } from '@/config/env';
import { logger } from '@/lib/logger';
import { resolveTempUploadReference } from '@/utils/temp-upload';
import { downloadService } from '../../download/download.service';
import { resolveDirectorStoragePath, unlinkLocalFileIfExists } from '../asset-file-cleanup';
import { directorRepo } from '../director.repo';
import { validateImportUrl } from '../director.utils';
import { videoMetadataService } from '../processing/video-metadata.service';

const REUSE_DURATION_TOLERANCE_MS = 2000;
const MIN_DIRECTOR_VIDEO_DURATION_SEC = 5 * 60;
const MAX_VIDEO_DURATION_TOLERANCE_SEC = 10;

function validateDirectorVideoGuards(input: { durationSeconds: number; sizeBytes?: number }): void {
  if (
    Number.isFinite(input.durationSeconds) &&
    input.durationSeconds > 0 &&
    input.durationSeconds < MIN_DIRECTOR_VIDEO_DURATION_SEC
  ) {
    throw new Error(
      'Video terlalu pendek (< 5 menit). AI Director dirancang untuk konten durasi panjang (minimal 5 menit).',
    );
  }

  const maxDurationSec = env.MAX_VIDEO_DURATION_MS / 1000;
  if (
    Number.isFinite(input.durationSeconds) &&
    input.durationSeconds > maxDurationSec + MAX_VIDEO_DURATION_TOLERANCE_SEC
  ) {
    throw new Error(
      `Video is too long (${Math.round(input.durationSeconds / 60)}m). Limit is ${Math.round(
        maxDurationSec / 60,
      )}m.`,
    );
  }

  if (
    typeof input.sizeBytes === 'number' &&
    input.sizeBytes > env.MAX_UPLOAD_SIZE_MB * 1024 * 1024
  ) {
    throw new Error(
      `Video is too large (~${Math.round(
        input.sizeBytes / 1024 / 1024,
      )}MB). Limit is ${env.MAX_UPLOAD_SIZE_MB}MB.`,
    );
  }
}

async function cleanupLocalFile(filePath: string, context: Record<string, string>): Promise<void> {
  try {
    await unlinkLocalFileIfExists(filePath);
  } catch (error) {
    logger.warn(
      {
        ...context,
        error: error instanceof Error ? error.message : String(error),
      },
      'Failed to cleanup director local file',
    );
  }
}

export const directorAssetService = {
  /**
   * Import video from URL or File
   */
  async importAsset(
    sessionId: string,
    userId: string,
    input: { type: 'url' | 'file'; url?: string; filePath?: string },
  ) {
    // Validate ownership
    const session = await directorRepo.findSession(sessionId, userId);

    if (!session) {
      throw new Error('Session not found or not authorized');
    }

    // Check if already has asset
    const existingAsset = await directorRepo.findAssetBySession(sessionId);

    if (existingAsset) {
      if (existingAsset.ingestStatus === DirectorIngestStatus.FAILED) {
        // Cleanup failed asset to allow retry
        await directorRepo.deleteAsset(existingAsset.id);
      } else {
        throw new Error('Session already has an asset. Delete and recreate session.');
      }
    }

    // Handle URL Import
    if (input.type === 'url' && input.url) {
      // Validate URL
      const { valid, normalized } = validateImportUrl(input.url);
      if (!valid) {
        throw new Error('URL not supported. Use YouTube, TikTok, Instagram, or Facebook.');
      }

      if (!normalized) {
        throw new Error('Invalid URL normalization');
      }

      // SMART VALIDATION: Check metadata before download (Intelligence Upgrade)
      const meta = await downloadService.getVideoMetadata(normalized);
      validateDirectorVideoGuards({
        durationSeconds: meta.duration,
        sizeBytes: meta.size,
      });

      const reusableAsset = await directorRepo.findLatestReusableUrlAsset(normalized);
      if (
        reusableAsset &&
        this.canReuseAssetFromMetadata(reusableAsset, meta.duration, meta.size)
      ) {
        const reusedAsset = await directorRepo.createAsset({
          id: randomUUID(),
          sessionId,
          storageKey: reusableAsset.storageKey,
          contentHash: reusableAsset.contentHash,
          origin: DirectorAssetOrigin.URL_IMPORT,
          sourceUrlNormalized: normalized,
          ingestStatus: DirectorIngestStatus.READY,
          mimeType: reusableAsset.mimeType,
          sizeBytes: reusableAsset.sizeBytes,
          durationMs: reusableAsset.durationMs,
          thumbnailStorageKey: reusableAsset.thumbnailStorageKey,
          metadata: reusableAsset.metadata ?? undefined,
        });

        logger.info(
          {
            sessionId,
            assetId: reusedAsset.id,
            reusedFromAssetId: reusableAsset.id,
            url: normalized,
          },
          'Director asset import (URL) reused existing storage asset',
        );
        return reusedAsset;
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
        mimeType: 'video/mp4',
        sizeBytes: BigInt(0),
        durationMs: this.toDurationMs(meta.duration),
        metadata: {
          title: meta.title,
        },
      });

      // Trigger background download
      this.triggerUrlDownload(asset.id, storageKey, normalized).catch((err) => {
        logger.error({ err, sessionId }, 'Background download failed');
      });

      logger.info({ sessionId, url: normalized }, 'Director asset import (URL) started');
      return asset;
    }

    // Handle File Import
    if (input.type === 'file' && input.filePath) {
      const tempUploadPath = resolveTempUploadReference(input.filePath);
      let shouldCleanupTempUpload = true;
      let destPath: string | null = null;

      try {
        // Verify temp file exists
        if (!existsSync(tempUploadPath)) {
          throw new Error('Uploaded file not found');
        }

        const fileStats = await stat(tempUploadPath);
        const fileMetadata = await videoMetadataService.getVideoMetadata(tempUploadPath);
        validateDirectorVideoGuards({
          durationSeconds: fileMetadata.duration,
          sizeBytes: fileStats.size,
        });
        const contentHash = await this.computeFileHash(tempUploadPath);

        const reusableAsset =
          (await directorRepo.findLatestReusableContentAsset(contentHash)) ??
          (await this.findReusableAssetByFileSignature(
            contentHash,
            fileStats.size,
            fileMetadata.duration,
          ));
        if (
          reusableAsset &&
          this.canReuseAssetFromMetadata(reusableAsset, fileMetadata.duration, fileStats.size)
        ) {
          await unlink(tempUploadPath);
          shouldCleanupTempUpload = false;

          const reusedAsset = await directorRepo.createAsset({
            id: randomUUID(),
            sessionId,
            storageKey: reusableAsset.storageKey,
            contentHash,
            origin: DirectorAssetOrigin.UPLOAD,
            ingestStatus: DirectorIngestStatus.READY,
            mimeType: reusableAsset.mimeType,
            sizeBytes: reusableAsset.sizeBytes,
            durationMs: reusableAsset.durationMs,
            thumbnailStorageKey: reusableAsset.thumbnailStorageKey,
            metadata: reusableAsset.metadata ?? undefined,
          });

          logger.info(
            {
              sessionId,
              assetId: reusedAsset.id,
              reusedFromAssetId: reusableAsset.id,
              contentHash,
            },
            'Director asset import (File) reused existing storage asset',
          );
          return reusedAsset;
        }

        // Prepare destination
        const assetId = randomUUID();
        const storageKey = `uploads/director/${assetId}.mp4`;

        // We assume local storage for now, mirroring the key structure
        // Real prod would upload to S3 here
        const uploadsDir = join(env.MEDIA_INPUT_DIR, 'director');
        if (!existsSync(uploadsDir)) {
          await mkdir(uploadsDir, { recursive: true });
        }

        destPath = join(uploadsDir, `${assetId}.mp4`);

        // Copy file then delete original (cross-filesystem compatible)
        await copyFile(tempUploadPath, destPath);
        await unlink(tempUploadPath);
        shouldCleanupTempUpload = false;

        // Create asset record
        const asset = await directorRepo.createAsset({
          id: assetId,
          sessionId,
          storageKey, // In a real app this would be s3 key. Here it maps to uploads/director/{uuid}.mp4
          contentHash,
          origin: DirectorAssetOrigin.UPLOAD,
          ingestStatus: DirectorIngestStatus.READY,
          mimeType: 'video/mp4',
          sizeBytes: BigInt(fileStats.size),
          durationMs: this.toDurationMs(fileMetadata.duration),
        });

        logger.info({ sessionId, filePath: destPath }, 'Director asset import (File) completed');
        return asset;
      } catch (error) {
        if (shouldCleanupTempUpload) {
          await cleanupLocalFile(tempUploadPath, { sessionId, phase: 'file-import-temp' });
        }

        if (destPath) {
          await cleanupLocalFile(destPath, { sessionId, phase: 'file-import-final' });
        }

        throw error;
      }
    }

    throw new Error('Invalid import input');
  },

  /**
   * Get asset for session
   */
  async getAsset(sessionId: string, userId: string) {
    const session = await directorRepo.findSession(sessionId, userId);

    if (!session || !session.asset) {
      throw new Error('Asset not found');
    }

    return session.asset;
  },

  /**
   * Background download helper
   */
  async triggerUrlDownload(assetId: string, storageKey: string, url: string) {
    let outputPath: string | null = null;
    try {
      // Use env.MEDIA_INPUT_DIR which is correctly mapped (e.g. /app/uploads in Docker)
      const uploadsDir = join(env.MEDIA_INPUT_DIR, 'director');
      if (!existsSync(uploadsDir)) {
        await mkdir(uploadsDir, { recursive: true });
      }

      const fileName = basename(storageKey);
      outputPath = join(uploadsDir, fileName);

      logger.info({ assetId, url, outputPath }, 'Starting background download');

      // Progress Key: director:asset:{assetId}:progress
      const progressKey = `director:asset:${assetId}:progress`;

      // Seed progress immediately so frontend starts at 0 instead of jumping to an arbitrary value.
      const { redis } = await import('@/lib/redis');
      await redis.set(progressKey, 0, 'EX', 300);
      logger.info({ assetId, progressKey }, 'Set initial progress to 0%');

      // Throttle progress updates (max once per 500ms to avoid Redis overload)
      let lastProgressTime = Date.now();
      let lastProgress = 0;

      await downloadService.downloadVideo(url, outputPath, async (percent) => {
        const now = Date.now();
        const roundedPercent = Math.round(percent);

        logger.debug(
          { assetId, roundedPercent, lastProgress, lastProgressTime },
          'Download progress callback invoked',
        );

        // Only update if: 500ms passed OR progress jumped 10%+ OR finished
        if (
          now - lastProgressTime > 500 ||
          roundedPercent - lastProgress >= 10 ||
          roundedPercent >= 100
        ) {
          lastProgressTime = now;
          lastProgress = roundedPercent;

          logger.info({ assetId, roundedPercent, progressKey }, 'Updating Redis with progress');
          await redis.set(progressKey, roundedPercent, 'EX', 300);
        }
      });

      // Get file size
      const fileStats = await stat(outputPath);
      const fileMetadata = await videoMetadataService.getVideoMetadata(outputPath);
      validateDirectorVideoGuards({
        durationSeconds: fileMetadata.duration,
        sizeBytes: fileStats.size,
      });
      const contentHash = await this.computeFileHash(outputPath);

      await directorRepo.updateAsset(assetId, {
        contentHash,
        ingestStatus: DirectorIngestStatus.READY,
        sizeBytes: fileStats.size,
        durationMs: this.toDurationMs(fileMetadata.duration),
      });

      // Clear progress key or set to 100
      await redis.set(progressKey, 100, 'EX', 60);

      logger.info({ assetId, size: fileStats.size }, 'Background download completed, asset READY');
    } catch (err) {
      logger.error({ err, assetId }, 'Background download failed');
      if (outputPath) {
        await cleanupLocalFile(outputPath, { assetId, phase: 'url-download' });
      }
      await directorRepo.updateAsset(assetId, {
        ingestStatus: DirectorIngestStatus.FAILED,
      });

      // Set error state in Redis for frontend to see immediately
      const { redis: redisClient } = await import('@/lib/redis');
      await redisClient.set(`director:asset:${assetId}:error`, (err as Error).message, 'EX', 60);
    }
  },

  toDurationMs(durationSeconds: number): number | undefined {
    if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
      return undefined;
    }

    return Math.round(durationSeconds * 1000);
  },

  canReuseAssetFromMetadata(
    asset: {
      storageKey: string;
      sizeBytes: bigint;
      durationMs: number | null;
    },
    durationSeconds: number,
    sizeBytes?: number,
  ): boolean {
    if (!this.assetFileExists(asset.storageKey)) {
      return false;
    }

    const expectedDurationMs = this.toDurationMs(durationSeconds);
    if (
      expectedDurationMs !== undefined &&
      asset.durationMs !== null &&
      Math.abs(asset.durationMs - expectedDurationMs) > REUSE_DURATION_TOLERANCE_MS
    ) {
      return false;
    }

    if (typeof sizeBytes === 'number' && sizeBytes > 0 && asset.sizeBytes !== BigInt(sizeBytes)) {
      return false;
    }

    return true;
  },

  assetFileExists(storageKey: string): boolean {
    return existsSync(this.resolveAssetPath(storageKey));
  },

  resolveAssetPath(storageKey: string): string {
    return resolveDirectorStoragePath(storageKey);
  },

  async computeFileHash(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = createHash('sha256');
      const stream = createReadStream(filePath);

      stream.on('data', (chunk) => {
        hash.update(chunk);
      });
      stream.on('error', reject);
      stream.on('end', () => {
        resolve(hash.digest('hex'));
      });
    });
  },

  async findReusableAssetByFileSignature(
    contentHash: string,
    sizeBytes: number,
    durationSeconds: number,
  ) {
    const durationMs = this.toDurationMs(durationSeconds);
    const candidates = await directorRepo.findReusableContentAssetCandidates(
      BigInt(sizeBytes),
      durationMs,
    );

    for (const candidate of candidates) {
      const candidatePath = this.resolveAssetPath(candidate.storageKey);
      if (!existsSync(candidatePath)) {
        continue;
      }

      const candidateHash = candidate.contentHash ?? (await this.computeFileHash(candidatePath));
      if (candidate.contentHash !== candidateHash) {
        await directorRepo.updateAsset(candidate.id, {
          contentHash: candidateHash,
        });
      }

      if (candidateHash === contentHash) {
        return candidate;
      }
    }

    return null;
  },
};
