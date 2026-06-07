import { type Job, Worker } from 'bullmq';
import { env } from '@/config/env';
import { logger } from '@/lib/logger';
import { redisOptions } from '@/lib/redis';
import {
  DIRECTOR_FINAL_PREVIEW_QUEUE_NAME,
  type DirectorFinalPreviewJobData,
} from './final-preview.queue';
import { processFinalPreviewJob } from './handlers/final-preview.handler';

export const directorFinalPreviewWorker = new Worker<DirectorFinalPreviewJobData>(
  DIRECTOR_FINAL_PREVIEW_QUEUE_NAME,
  (job: Job<DirectorFinalPreviewJobData>) => processFinalPreviewJob(job),
  {
    connection: redisOptions,
    concurrency: env.DIRECTOR_FINAL_PREVIEW_CONCURRENCY,
    limiter: {
      max: env.DIRECTOR_FINAL_PREVIEW_CONCURRENCY,
      duration: 1000,
    },
  },
);

directorFinalPreviewWorker.on('completed', (job) => {
  logger.info(
    { jobId: job.id, sessionId: job.data.sessionId },
    'Director final preview job completed',
  );
});

directorFinalPreviewWorker.on('failed', (job, err) => {
  logger.error(
    { jobId: job?.id, sessionId: job?.data.sessionId, err },
    'Director final preview job failed',
  );
});
