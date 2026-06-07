/**
 * Director Export Service
 * Handles export jobs
 */

import { DirectorJobStatus, DirectorStep } from '@prisma/client';
import { logger } from '@/lib/logger';
import { assertWorkspaceActive } from '@/modules/workspace/workspace-lifecycle';
import { buildDirectorQueueJobId, directorQueue } from '../director.queue';
import { directorRepo } from '../director.repo';

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
    assertWorkspaceActive(session.lifecycleStatus, session.expiresAt);

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
