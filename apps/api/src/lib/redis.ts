import type { RedisOptions } from 'ioredis';
import Redis from 'ioredis';
import { env } from '@/config/env';
import { logger } from '@/lib/logger';

const isVitestRuntime = process.env.VITEST === 'true' || process.env.VITEST_WORKER_ID !== undefined;

/**
 * Redis Client with timeout and retry configuration
 *
 * Per Digitesia Standard (H2 - Timeouts for all I/O):
 * - Connection timeout: 5 seconds
 * - Command timeout: 5 seconds
 * - Bounded retries: Max 3 attempts with exponential backoff
 */
/**
 * Shared Redis options for BullMQ and direct Redis clients.
 *
 * Vitest runs without a real Redis instance for most unit tests. Keep clients lazy in that runtime
 * so importing modules that reference Redis does not open a localhost connection by accident.
 */
export const redisOptions: RedisOptions = {
  host: new URL(env.REDIS_URL).hostname || 'localhost',
  port: Number.parseInt(new URL(env.REDIS_URL).port || '6379', 10),
  password: new URL(env.REDIS_URL).password || undefined,
  lazyConnect: isVitestRuntime,
  maxRetriesPerRequest: null, // Required for BullMQ workers
};

export const redis = new Redis(env.REDIS_URL, {
  ...redisOptions,
  // Timeout configuration
  connectTimeout: 5000, // 5s to establish connection
  commandTimeout: 5000, // 5s per command

  // Retry strategy (bounded)
  maxRetriesPerRequest: 3, // Max 3 retries per command
  retryStrategy: (times: number) => {
    if (times > 3) {
      logger.error({ times }, 'Redis max retries exceeded');
      return null; // Stop retrying
    }
    // Exponential backoff: 100ms, 200ms, 400ms
    const delay = Math.min(times * 100, 2000);
    logger.warn({ times, delay }, 'Redis retry attempt');
    return delay;
  },

  // Connection options
  enableReadyCheck: true, // Wait for Redis READY before accepting commands
  lazyConnect: isVitestRuntime, // Connect immediately outside test runtime

  // Reconnection options
  reconnectOnError: (err) => {
    const targetError = 'READONLY';
    if (err.message.includes(targetError)) {
      // Reconnect on READONLY errors (Redis failover)
      return true;
    }
    return false;
  },
});

redis.on('error', (err) => {
  logger.error({ err: err.message }, 'Redis connection error');
});

redis.on('connect', () => {
  logger.info('Redis connected successfully');
});

redis.on('ready', () => {
  logger.info('Redis ready to accept commands');
});

redis.on('reconnecting', (delay: number) => {
  logger.warn({ delay }, 'Redis reconnecting');
});
