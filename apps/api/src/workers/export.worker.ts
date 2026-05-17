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

async function shutdown(signal: NodeJS.Signals): Promise<void> {
  logger.info({ signal }, 'Shutting down export worker');
  await exportWorker.close();
  await closeExportQueue();
  await redis.quit();
  await prisma.$disconnect();
  process.exit(0);
}

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    void shutdown(signal);
  });
}
