/**
 * Retention Job Processor
 * ============================================================================
 * BullMQ worker for cleaning up expired trending items
 */

import { type Job, Worker } from 'bullmq';
import { logger } from '@/lib/logger';
import { redisOptions } from '@/lib/redis';
import { trendingService } from '../trending.service';
import type { RetentionJobData } from './trending.queue';

// ============================================================================
// RETENTION WORKER
// ============================================================================

export const trendingRetentionWorker = new Worker<RetentionJobData>(
  'trending-retention',
  async (job: Job<RetentionJobData>) => {
    const startTime = Date.now();
    logger.info({ jobId: job.id }, 'Starting trending retention cleanup');

    try {
      const deletedCount = await trendingService.cleanupExpired();
      const durationMs = Date.now() - startTime;

      logger.info(
        { jobId: job.id, deletedCount, durationMs },
        'Trending retention cleanup completed',
      );

      return { deletedCount };
    } catch (err) {
      const durationMs = Date.now() - startTime;
      logger.error({ jobId: job.id, error: err, durationMs }, 'Trending retention cleanup failed');
      throw err;
    }
  },
  {
    connection: redisOptions,
    concurrency: 1,
  },
);

// ============================================================================
// EVENT HANDLERS
// ============================================================================

trendingRetentionWorker.on('completed', (job) => {
  logger.debug({ jobId: job.id }, 'Trending retention job completed');
});

trendingRetentionWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, error: err.message }, 'Trending retention job failed');
});

trendingRetentionWorker.on('error', (err) => {
  logger.error({ error: err.message }, 'Trending retention worker error');
});
