/**
 * Director Export Service
 * Handles export jobs
 */

import { existsSync } from 'node:fs';
import { access, mkdir, rename, unlink } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { DirectorJobStatus, DirectorStep } from '@prisma/client';
import { env } from '@/config/env';
import { logger } from '@/lib/logger';
import { directorProcessor } from '../director.processor';
import { buildDirectorQueueJobId, directorQueue } from '../director.queue';
import { directorRepo } from '../director.repo';
import { buildExportClipFromSelectedClip } from '../export-clip-builder';
import { buildLivePreviewCacheFileName } from '../live-preview-cache';
import { runWithPreviewGenerationLock } from '../preview-generation-lock';
import type { SubtitleStyleOptions } from '../processing/video-export-subtitles';

type ExportRefineSettings = Record<
  string,
  {
    faceTracking?: boolean;
    removeSilence?: boolean;
    optimizeHook?: boolean;
    stabilize?: boolean;
    contentMode?:
      | 'auto'
      | 'podcast'
      | 'interview'
      | 'talking-head'
      | 'product-review'
      | 'cinematic'
      | 'general';
  }
>;

export interface ExportOptionsInput {
  aspectRatio?: string;
  quality?: string;
  includeSubtitles?: boolean;
  normalizeAudio?: boolean;
  refineSettings?: ExportRefineSettings;
}

function clampProgress(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(value)));
}

function getProgressFromQueue(raw: unknown): number | null {
  if (typeof raw === 'number') {
    return clampProgress(raw);
  }

  if (
    raw &&
    typeof raw === 'object' &&
    'percent' in raw &&
    typeof (raw as { percent?: unknown }).percent === 'number'
  ) {
    return clampProgress((raw as { percent: number }).percent);
  }

  return null;
}

function getProgressFromStatus(status: DirectorJobStatus): number {
  if (status === DirectorJobStatus.COMPLETED) {
    return 100;
  }

  if (status === DirectorJobStatus.FAILED) {
    return 0;
  }

  if (status === DirectorJobStatus.PROCESSING) {
    return 10;
  }

  return 0;
}

export const directorExportService = {
  /**
   * Start export job
   */
  async startExport(sessionId: string, userId: string, options: ExportOptionsInput) {
    const session = await directorRepo.findSession(sessionId, userId);

    if (!session) {
      throw new Error('Session not found');
    }

    if (session.selectedClips.length === 0) {
      throw new Error('Tidak ada klip terpilih');
    }

    if (session.selectedClips.length !== 1) {
      throw new Error('Ekspor hanya mendukung 1 klip untuk 1 short');
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

    const job = await directorRepo.createExportJob({
      sessionId,
      idempotencyKey,
      status: DirectorJobStatus.PENDING,
      aspectRatio: options.aspectRatio ?? '9:16',
      quality: options.quality ?? '1080p',
      includeSubtitles: options.includeSubtitles ?? true,
    });

    // Update session step
    await directorRepo.updateStep(sessionId, userId, DirectorStep.EXPORTING);

    // Queue BullMQ job for export
    await directorQueue.add(
      'export',
      {
        type: 'EXPORT',
        sessionId,
        userId,
        options: {
          includeSubtitles: job.includeSubtitles,
          normalizeAudio: options.normalizeAudio ?? true,
          aspectRatio: job.aspectRatio as '9:16' | '16:9' | '1:1',
          quality: job.quality as '720p' | '1080p',
          refineSettings: options.refineSettings,
        },
      },
      {
        jobId: buildDirectorQueueJobId('director', 'export', job.id),
        removeOnComplete: true,
      },
    );

    logger.info({ sessionId, jobId: job.id }, 'Director export job queued');

    return job;
  },

  /**
   * Build and cache an export-accurate preview video (same renderer as final export).
   */
  async buildFinalPreview(
    sessionId: string,
    userId: string,
    options: ExportOptionsInput & {
      subtitleStyle?: SubtitleStyleOptions;
    },
  ) {
    const session = await directorRepo.findSession(sessionId, userId);
    if (!session) {
      throw new Error('Session not found');
    }

    if (session.selectedClips.length === 0) {
      throw new Error('Tidak ada klip terpilih');
    }

    if (session.selectedClips.length !== 1) {
      throw new Error('Preview final hanya mendukung 1 klip untuk 1 short');
    }

    const asset = session.asset;
    if (!asset) {
      throw new Error('Session asset not found');
    }

    const sourceFileName = basename(asset.storageKey);
    const sourcePath = join(env.MEDIA_INPUT_DIR, 'director', sourceFileName);
    if (!existsSync(sourcePath)) {
      throw new Error(`Asset file missing: ${sourcePath}`);
    }

    const selectedClip = session.selectedClips[0];
    if (!selectedClip) {
      throw new Error('Selected clip not found');
    }

    const builtClip = buildExportClipFromSelectedClip({
      clip: {
        id: selectedClip.id,
        trimStartMs: selectedClip.trimStartMs,
        trimEndMs: selectedClip.trimEndMs,
        candidate: {
          startMs: selectedClip.candidate.startMs,
          endMs: selectedClip.candidate.endMs,
          metadata: selectedClip.candidate.metadata,
        },
        transcript: selectedClip.transcript?.segments
          ? {
              segments: selectedClip.transcript.segments as Array<{
                startMs: number;
                endMs: number;
                text: string;
                speaker?: string;
                words?: Array<{
                  startMs: number;
                  endMs: number;
                  text: string;
                  confidence?: number;
                  speaker?: string;
                }>;
              }>,
            }
          : undefined,
      },
      sourcePath,
      settings: options.refineSettings?.[selectedClip.id],
    });

    const normalizedOptions = {
      includeSubtitles: options.includeSubtitles ?? true,
      normalizeAudio: options.normalizeAudio ?? true,
      aspectRatio: (options.aspectRatio ?? '9:16') as '9:16' | '16:9' | '1:1',
      quality: (options.quality ?? '1080p') as '720p' | '1080p',
      subtitleStyle: options.subtitleStyle,
    };

    const outputDir = join(env.MEDIA_INPUT_DIR, 'director', 'live-previews');
    await mkdir(outputDir, { recursive: true });

    const previewFileName = buildLivePreviewCacheFileName({
      sessionId,
      sourceFileName,
      clipPayload: builtClip,
      options: normalizedOptions,
    });
    const previewFilePath = join(outputDir, previewFileName);

    if (!existsSync(previewFilePath)) {
      await runWithPreviewGenerationLock(previewFilePath, async () => {
        try {
          await access(previewFilePath);
          return;
        } catch {
          // Continue generation while the file is still missing.
        }

        const generatedFile = await directorProcessor.exportVideo([builtClip], outputDir, {
          ...normalizedOptions,
        });
        const generatedPath = join(outputDir, generatedFile);

        try {
          await rename(generatedPath, previewFilePath);
        } catch (error) {
          if (existsSync(previewFilePath)) {
            await unlink(generatedPath).catch(() => {});
            return;
          }
          throw error;
        }
      });
    }

    return {
      previewFileName,
      previewStorageKey: `director/live-previews/${previewFileName}`,
    };
  },

  /**
   * Get export result
   */
  async getExportResult(sessionId: string, userId: string) {
    const session = await directorRepo.findSession(sessionId, userId);

    if (!session || !session.exportJob) {
      throw new Error('Export not found');
    }

    const queueJobId = buildDirectorQueueJobId('director', 'export', session.exportJob.id);
    const queueJob = await directorQueue.getJob(queueJobId);
    const queueProgress = getProgressFromQueue(queueJob?.progress);

    return {
      ...session.exportJob,
      progress:
        queueProgress === null ? getProgressFromStatus(session.exportJob.status) : queueProgress,
    };
  },
};
