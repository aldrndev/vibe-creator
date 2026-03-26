/**
 * Director Export Service
 * Handles export jobs
 */

import { DirectorJobStatus, DirectorStep } from '@prisma/client';
import { logger } from '@/lib/logger';
import { directorQueue } from '../director.queue';
import { directorRepo } from '../director.repo';

export const directorExportService = {
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
    },
  ) {
    const session = await directorRepo.findSession(sessionId, userId);

    if (!session) {
      throw new Error('Session not found');
    }

    if (session.selectedClips.length === 0) {
      throw new Error('No clips selected');
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
          aspectRatio: job.aspectRatio as '9:16' | '16:9' | '1:1',
          quality: job.quality as '720p' | '1080p',
        },
      },
      {
        jobId: `director:export:${job.id}`,
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

    return session.exportJob;
  },
};
