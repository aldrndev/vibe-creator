/**
 * Trending Queue
 * ============================================================================
 * BullMQ queue definitions for trending refresh jobs
 */

import { Queue } from "bullmq";
import { redisOptions } from "@/lib/redis";

// ============================================================================
// QUEUE DEFINITIONS
// ============================================================================

/**
 * Main refresh queue (concurrency: 1)
 */
export const trendingQueue = new Queue("trending-refresh", {
  connection: redisOptions,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});

/**
 * Retention cleanup queue (concurrency: 1)
 */
export const trendingRetentionQueue = new Queue("trending-retention", {
  connection: redisOptions,
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: "fixed",
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
  region: string;
  mode: "quick" | "full";
  idempotencyKey: string;
}

export interface RetentionJobData {
  batchSize?: number;
}

/**
 * Initialize repeatable schedules (CRON)
 */
export async function initTrendingSchedules() {
  // Refresh: Every 1 hour
  await trendingQueue.add(
    "scheduled-refresh-id",
    { region: "ID", mode: "full", idempotencyKey: "auto" },
    {
      repeat: {
        every: 60 * 60 * 1000, // 1 hour
      },
      jobId: "cron-trending-refresh-id", // Singleton ID
    }
  );

  // Retention: Every 24 hours
  await trendingRetentionQueue.add(
    "scheduled-retention",
    { batchSize: 100 },
    {
      repeat: {
        every: 24 * 60 * 60 * 1000, // 24 hours
      },
      jobId: "cron-trending-retention",
    }
  );

  // Add immediate one-time refresh on startup (if data is empty/stale)
  await trendingQueue.add(
    "startup-refresh",
    { region: "ID", mode: "full", idempotencyKey: `startup-${Date.now()}` },
    { delay: 5000 } // 5 second delay to let server fully boot
  );

  console.info("🕒 Trending schedules initialized (1h refresh, 24h retention)");
}
