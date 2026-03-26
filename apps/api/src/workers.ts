import { logger } from '@/lib/logger';
import { directorWorker } from '@/modules/director/director.worker';
import { trendingRetentionWorker } from '@/modules/trending/jobs/retention.processor';
import { trendingRefreshWorker } from '@/modules/trending/jobs/trending.processor';
import { initTrendingSchedules } from '@/modules/trending/jobs/trending.queue';

/**
 * Start all background workers
 */
export async function startWorkers() {
  logger.info('Starting background workers...');

  // Initialize Schedules
  await initTrendingSchedules().catch((err) =>
    logger.error({ err }, 'Failed to init trending schedules'),
  );

  // Director Analysis Worker
  directorWorker.on('ready', () => {
    logger.info('🎬 Director Worker ready');
  });

  directorWorker.on('error', (err) => {
    logger.error({ err }, '🎬 Director Worker error');
  });

  // Trending Workers
  trendingRefreshWorker.on('ready', () => {
    logger.info('📈 Trending Refresh Worker ready');
  });

  trendingRefreshWorker.on('error', (err) => {
    logger.error({ err }, '📈 Trending Refresh Worker error');
  });

  trendingRetentionWorker.on('ready', () => {
    logger.info('🧹 Trending Retention Worker ready');
  });

  trendingRetentionWorker.on('error', (err) => {
    logger.error({ err }, '🧹 Trending Retention Worker error');
  });

  // Keep workers alive
  return {
    directorWorker,
    trendingRefreshWorker,
    trendingRetentionWorker,
  };
}
