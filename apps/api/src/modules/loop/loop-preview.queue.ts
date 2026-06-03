import { Queue } from 'bullmq';
import { logger } from '@/lib/logger';
import { redisOptions } from '@/lib/redis';

export const LOOP_PREVIEW_QUEUE_NAME = 'loop-creator-preview';

export interface LoopPreviewJobData {
  readonly previewId: string;
  readonly userId: string;
  readonly requestId: string;
}

const loopPreviewQueue = new Queue<LoopPreviewJobData, unknown, string>(LOOP_PREVIEW_QUEUE_NAME, {
  connection: redisOptions,
  defaultJobOptions: {
    attempts: 1,
    removeOnComplete: { age: 24 * 60 * 60, count: 200 },
    removeOnFail: { age: 24 * 60 * 60 },
  },
});

export async function addLoopPreviewJob(data: LoopPreviewJobData): Promise<void> {
  await loopPreviewQueue.add('preview', data, { jobId: data.previewId });
  logger.info({ previewId: data.previewId, userId: data.userId }, 'Loop preview enqueued');
}

export async function closeLoopPreviewQueue(): Promise<void> {
  await loopPreviewQueue.close();
}
