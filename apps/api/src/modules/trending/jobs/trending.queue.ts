/**
 * Trending Queue
 * ============================================================================
 * BullMQ queue definitions for trending refresh jobs
 */

import type { TrendingRegionCode } from '@vibe-creator/shared';
import { Queue } from 'bullmq';
import { redisOptions } from '@/lib/redis';
import {
  buildTrendingScheduledRefreshDefinitions,
  buildTrendingStartupRefreshDefinitions,
} from '../trending-refresh-jobs';

// ============================================================================
// QUEUE DEFINITIONS
// ============================================================================

/**
 * Main refresh queue (concurrency: 1)
 */
export const trendingQueue = new Queue('trending-refresh', {
  connection: redisOptions,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});

/**
 * Retention cleanup queue (concurrency: 1)
 */
export const trendingRetentionQueue = new Queue('trending-retention', {
  connection: redisOptions,
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: 'fixed',
      delay: 10000,
    },
    removeOnComplete: 10,
    removeOnFail: 10,
  },
});

// ============================================================================
// JOB TYPES
// ============================================================================

export interface RefreshJobData {
  region: TrendingRegionCode;
  mode: 'quick' | 'full';
  idempotencyKey: string;
}

export interface RetentionJobData {
  batchSize?: number;
}

const LEGACY_REPEATABLE_REFRESH_JOB_IDS = new Set(['cron-trending-refresh-id']);

async function removeLegacyTrendingSchedules(): Promise<void> {
  const repeatableJobs = await trendingQueue.getRepeatableJobs();

  await Promise.all(
    repeatableJobs
      .filter((job) => job.id && LEGACY_REPEATABLE_REFRESH_JOB_IDS.has(job.id))
      .map((job) => trendingQueue.removeRepeatableByKey(job.key)),
  );
}

/**
 * Initialize repeatable schedules (CRON)
 */
export async function initTrendingSchedules() {
  await removeLegacyTrendingSchedules();

  for (const refreshJob of buildTrendingScheduledRefreshDefinitions()) {
    await trendingQueue.add(
      refreshJob.name,
      {
        region: refreshJob.region,
        mode: refreshJob.mode,
        idempotencyKey: refreshJob.idempotencyKey,
      },
      {
        repeat: {
          every: refreshJob.repeatEveryMs,
        },
        jobId: refreshJob.jobId,
      },
    );
  }

  // Retention: Every 24 hours
  await trendingRetentionQueue.add(
    'scheduled-retention',
    { batchSize: 100 },
    {
      repeat: {
        every: 24 * 60 * 60 * 1000, // 24 hours
      },
      jobId: 'cron-trending-retention',
    },
  );

  // Add staggered one-time refresh jobs on startup so new regions get cache without user action.
  for (const startupJob of buildTrendingStartupRefreshDefinitions()) {
    await trendingQueue.add(
      startupJob.name,
      {
        region: startupJob.region,
        mode: startupJob.mode,
        idempotencyKey: startupJob.idempotencyKey,
      },
      { delay: startupJob.delayMs },
    );
  }
}
