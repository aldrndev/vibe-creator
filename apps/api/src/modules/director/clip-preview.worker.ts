import { type Job, Worker } from 'bullmq';
import { env } from '@/config/env';
import { logger } from '@/lib/logger';
import { redisOptions } from '@/lib/redis';
import {
  DIRECTOR_CLIP_PREVIEW_QUEUE_NAME,
  type DirectorClipPreviewJobData,
} from './clip-preview.queue';
import { processClipPreviewJob } from './handlers/clip-preview.handler';

export const directorClipPreviewWorker = new Worker<DirectorClipPreviewJobData>(
  DIRECTOR_CLIP_PREVIEW_QUEUE_NAME,
  (job: Job<DirectorClipPreviewJobData>) => processClipPreviewJob(job),
  {
    connection: redisOptions,
    concurrency: env.DIRECTOR_CLIP_PREVIEW_CONCURRENCY,
    limiter: {
      max: env.DIRECTOR_CLIP_PREVIEW_CONCURRENCY,
      duration: 1000,
    },
  },
);

directorClipPreviewWorker.on('completed', (job) => {
  logger.info({ jobId: job.id, clipId: job.data.clipId }, 'Director clip preview job completed');
});

directorClipPreviewWorker.on('failed', (job, err) => {
  logger.error(
    { jobId: job?.id, clipId: job?.data.clipId, err },
    'Director clip preview job failed',
  );
});
