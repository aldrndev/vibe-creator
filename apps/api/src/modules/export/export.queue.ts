import { Queue } from 'bullmq';
import { logger } from '@/lib/logger';
import { redisOptions } from '@/lib/redis';

export const EXPORT_QUEUE_NAME = 'video-studio-export';

export interface ExportRenderJobData {
  readonly jobId: string;
  readonly userId: string;
  readonly requestId: string;
}

export interface ExportQueueStats {
  readonly waiting: number;
  readonly active: number;
  readonly completed: number;
  readonly failed: number;
  readonly delayed: number;
}

export const exportQueue = new Queue<ExportRenderJobData, unknown, string>(EXPORT_QUEUE_NAME, {
  connection: redisOptions,
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: 'exponential',
      delay: 10_000,
    },
    removeOnComplete: {
      age: 48 * 60 * 60,
      count: 200,
    },
    removeOnFail: {
      age: 7 * 24 * 60 * 60,
    },
  },
});

/**
 * Enqueue a Video Studio export render. The job payload stays intentionally small;
 * the worker loads timeline/export details from ExportHistory by jobId.
 */
export async function addExportJob(data: ExportRenderJobData): Promise<string> {
  const job = await exportQueue.add('render', data, {
    jobId: data.jobId,
  });

  logger.info(
    {
      jobId: data.jobId,
      queueJobId: job.id,
      userId: data.userId,
      requestId: data.requestId,
    },
    'Export job enqueued',
  );

  return job.id ?? data.jobId;
}

/**
 * Read BullMQ queue depth for backpressure decisions.
 */
export async function getExportQueueStats(): Promise<ExportQueueStats> {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    exportQueue.getWaitingCount(),
    exportQueue.getActiveCount(),
    exportQueue.getCompletedCount(),
    exportQueue.getFailedCount(),
    exportQueue.getDelayedCount(),
  ]);

  return { waiting, active, completed, failed, delayed };
}

/**
 * Remove a queued export if it has not started yet.
 */
export async function removeWaitingExportJob(jobId: string): Promise<boolean> {
  const queueJob = await exportQueue.getJob(jobId);
  if (!queueJob) {
    return false;
  }

  const state = await queueJob.getState();
  if (state !== 'waiting' && state !== 'delayed') {
    return false;
  }

  await queueJob.remove();
  return true;
}

/**
 * Close Redis connections opened by this queue wrapper.
 */
export async function closeExportQueue(): Promise<void> {
  await exportQueue.close();
  logger.info('Export queue closed');
}
