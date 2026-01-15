/**
 * Trending Job Processor
 * ============================================================================
 * BullMQ worker for processing trending refresh jobs
 */

import { Worker, Job } from "bullmq";
import { redisOptions } from "@/lib/redis";
import { trendingService } from "../trending.service";
import { logger } from "@/lib/logger";
import type { RefreshJobData } from "./trending.queue";

// ============================================================================
// REFRESH WORKER
// ============================================================================

export const trendingRefreshWorker = new Worker<RefreshJobData>(
  "trending-refresh",
  async (job: Job<RefreshJobData>) => {
    const { region, mode, idempotencyKey } = job.data;

    const startTime = Date.now();
    logger.info(
      { jobId: job.id, region, mode, idempotencyKey },
      "Starting trending refresh"
    );

    try {
      const result = await trendingService.executeRefresh(region, mode);

      const durationMs = Date.now() - startTime;

      if (result.status === "ok") {
        logger.info(
          {
            jobId: job.id,
            region,
            mode,
            itemCount: result.itemCount,
            durationMs,
          },
          "Trending refresh completed successfully"
        );
      } else {
        logger.warn(
          {
            jobId: job.id,
            region,
            mode,
            status: result.status,
            error: result.error,
            durationMs,
          },
          "Trending refresh completed with issues"
        );
      }

      return result;
    } catch (err) {
      const durationMs = Date.now() - startTime;
      logger.error(
        { jobId: job.id, region, mode, error: err, durationMs },
        "Trending refresh failed"
      );
      throw err;
    }
  },
  {
    connection: redisOptions,
    concurrency: 1,
  }
);

// ============================================================================
// EVENT HANDLERS
// ============================================================================

trendingRefreshWorker.on("completed", (job) => {
  logger.debug({ jobId: job.id }, "Trending refresh job completed");
});

trendingRefreshWorker.on("failed", (job, err) => {
  logger.error(
    { jobId: job?.id, error: err.message },
    "Trending refresh job failed"
  );
});

trendingRefreshWorker.on("error", (err) => {
  logger.error({ error: err.message }, "Trending refresh worker error");
});
