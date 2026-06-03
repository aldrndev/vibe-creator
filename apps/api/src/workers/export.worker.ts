import { Worker } from 'bullmq';
import { env } from '@/config/env';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { redis, redisOptions } from '@/lib/redis';
import {
  closeExportQueue,
  EXPORT_QUEUE_NAME,
  type ExportRenderJobData,
} from '@/modules/export/export.queue';
import { processExportJob } from '@/modules/export/processors/export.processor';
import {
  closeLoopPreviewQueue,
  LOOP_PREVIEW_QUEUE_NAME,
  type LoopPreviewJobData,
} from '@/modules/loop/loop-preview.queue';
import { processLoopPreviewJob } from '@/modules/loop/processors/loop-preview.processor';

const exportWorker = new Worker<ExportRenderJobData>(
  EXPORT_QUEUE_NAME,
  async (job) => {
    const { jobId, userId, requestId } = job.data;
    logger.info({ jobId, userId, requestId, queueJobId: job.id }, 'Starting export worker job');
    await processExportJob(jobId);
  },
  {
    connection: redisOptions,
    concurrency: env.EXPORT_WORKER_CONCURRENCY,
  },
);

exportWorker.on('ready', () => {
  logger.info({ concurrency: env.EXPORT_WORKER_CONCURRENCY }, 'Export worker ready');
});

exportWorker.on('completed', (job) => {
  logger.info({ jobId: job.data.jobId, queueJobId: job.id }, 'Export worker job completed');
});

exportWorker.on('failed', (job, err) => {
  logger.error(
    {
      jobId: job?.data.jobId,
      queueJobId: job?.id,
      attemptsMade: job?.attemptsMade,
      err,
    },
    'Export worker job failed',
  );
});

exportWorker.on('stalled', (jobId) => {
  logger.warn({ queueJobId: jobId }, 'Export worker job stalled');
});

const loopPreviewWorker = new Worker<LoopPreviewJobData>(
  LOOP_PREVIEW_QUEUE_NAME,
  async (job) => {
    logger.info({ previewId: job.data.previewId, queueJobId: job.id }, 'Starting loop preview job');
    await processLoopPreviewJob(job.data.previewId);
  },
  { connection: redisOptions, concurrency: 1 },
);

loopPreviewWorker.on('ready', () => {
  logger.info('Loop preview worker ready');
});

loopPreviewWorker.on('failed', (job, err) => {
  logger.error(
    { previewId: job?.data.previewId, queueJobId: job?.id, err },
    'Loop preview job failed',
  );
});

async function shutdown(signal: NodeJS.Signals): Promise<void> {
  logger.info({ signal }, 'Shutting down export worker');
  await Promise.all([exportWorker.close(), loopPreviewWorker.close()]);
  await Promise.all([closeExportQueue(), closeLoopPreviewQueue()]);
  await redis.quit();
  await prisma.$disconnect();
  process.exit(0);
}

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    void shutdown(signal);
  });
}
