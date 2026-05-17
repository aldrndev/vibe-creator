/**
 * Export Cancel Service
 * End-to-end cancellation: API → BullMQ → FFmpeg process
 */

import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { removeWaitingExportJob } from './export.queue';
import { unregisterActiveJob } from './export-concurrency';
import { publishExportEvent } from './export-events';
import { cleanupTempDir, createJobTempDir } from './ffmpeg/index';

export interface CancelResult {
  success: boolean;
  status: 'CANCELLED' | 'ALREADY_COMPLETED' | 'NOT_FOUND' | 'ERROR';
  message: string;
}

/**
 * Cancel an export job
 * Handles: queued jobs, active jobs, and already-completed jobs
 */
export async function cancelExportJob(jobId: string, userId: string): Promise<CancelResult> {
  try {
    // 1. Verify ownership
    const exportRecord = await prisma.exportHistory.findUnique({
      where: { id: jobId },
      select: { userId: true, status: true, phase: true },
    });

    if (!exportRecord) {
      return {
        success: false,
        status: 'NOT_FOUND',
        message: 'Export job not found',
      };
    }

    if (exportRecord.userId !== userId) {
      return {
        success: false,
        status: 'NOT_FOUND',
        message: 'Export job not found', // Don't leak existence
      };
    }

    // 2. Check if already cancelled (phase CANCELLED means user-cancelled)
    if (exportRecord.phase === 'CANCELLED') {
      return {
        success: true,
        status: 'CANCELLED',
        message: 'Export job was already cancelled',
      };
    }

    // 3. Check if already completed/failed
    if (exportRecord.status === 'COMPLETED' || exportRecord.status === 'FAILED') {
      return {
        success: false,
        status: 'ALREADY_COMPLETED',
        message: 'Export job has already finished',
      };
    }

    // 4. Mark as CANCEL_REQUESTED in database
    await prisma.exportHistory.update({
      where: { id: jobId },
      data: {
        phase: 'CANCEL_REQUESTED',
      },
    });

    // 5. Try to remove from BullMQ queue (if still waiting)
    const removedFromQueue = await removeWaitingExportJob(jobId);
    if (removedFromQueue) {
      logger.info({ jobId }, 'Removed export job from queue');
    } else {
      logger.info({ jobId }, 'Export job already active or missing from waiting queue');
    }

    // 6. Update final status (use FAILED with CANCELLED phase)
    await prisma.exportHistory.update({
      where: { id: jobId },
      data: {
        status: 'FAILED',
        phase: 'CANCELLED',
        errorMessage: 'Cancelled by user',
      },
    });
    await publishExportEvent({
      type: 'failed',
      jobId,
      errorMessage: 'Export dibatalkan.',
    });

    // 7. Cleanup concurrency tracking
    await unregisterActiveJob(userId, jobId);

    // 8. Cleanup temp directory
    const tempDir = createJobTempDir(jobId);
    await cleanupTempDir(tempDir);

    logger.info({ jobId, userId }, 'Export job cancelled successfully');

    return {
      success: true,
      status: 'CANCELLED',
      message: 'Export job cancelled',
    };
  } catch (error) {
    logger.error({ jobId, userId, error }, 'Failed to cancel export job');

    return {
      success: false,
      status: 'ERROR',
      message: 'Failed to cancel export job',
    };
  }
}

/**
 * Batch cancel all active exports for a user
 * Useful for account deletion or emergency cleanup
 */
export async function cancelAllUserExports(userId: string): Promise<number> {
  try {
    const activeExports = await prisma.exportHistory.findMany({
      where: {
        userId,
        status: 'PROCESSING',
      },
      select: { id: true },
    });

    let cancelledCount = 0;

    for (const exportRecord of activeExports) {
      const result = await cancelExportJob(exportRecord.id, userId);
      if (result.success) {
        cancelledCount++;
      }
    }

    logger.info({ userId, cancelledCount }, 'Cancelled all user exports');

    return cancelledCount;
  } catch (error) {
    logger.error({ userId, error }, 'Failed to cancel all user exports');
    return 0;
  }
}
