import Redis from 'ioredis';
import { env } from '@/config/env';
import { logger } from '@/lib/logger';

/**
 * Redis Client with timeout and retry configuration
 *
 * Per Digitesia Standard (H2 - Timeouts for all I/O):
 * - Connection timeout: 5 seconds
 * - Command timeout: 5 seconds
 * - Bounded retries: Max 3 attempts with exponential backoff
 */
// Shared Redis Options for BullMQ compatibility
export const redisOptions = {
  host: new URL(env.REDIS_URL).hostname || 'localhost',
  port: parseInt(new URL(env.REDIS_URL).port || '6379', 10),
  password: new URL(env.REDIS_URL).password || undefined,
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
  lazyConnect: false, // Connect immediately

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
