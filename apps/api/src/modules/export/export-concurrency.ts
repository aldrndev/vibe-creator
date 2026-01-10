/**
 * Export Concurrency Limiter
 * Per-user and global concurrency control for export jobs
 */

import { redis } from '@/lib/redis';
import { logger } from '@/lib/logger';
import { TIER_LIMITS, type ExportTier } from './export-capability';

const REDIS_PREFIX = 'export:concurrency:';
const USER_JOBS_KEY = (userId: string) => `${REDIS_PREFIX}user:${userId}`;
const GLOBAL_JOBS_KEY = `${REDIS_PREFIX}global`;

/**
 * Global concurrency limits
 */
const GLOBAL_LIMITS = {
  maxConcurrent: 20,     // Max concurrent jobs across all users
  maxQueuedPerUser: 5,   // Max jobs in queue per user
};

export interface ConcurrencyCheck {
  allowed: boolean;
  reason?: string;
  currentActive: number;
  maxAllowed: number;
}

/**
 * Check if user can start a new export job
 */
export async function canStartExport(
  userId: string,
  tier: ExportTier
): Promise<ConcurrencyCheck> {
  const maxConcurrent = TIER_LIMITS[tier].maxConcurrentJobs;
  
  try {
    // Get user's current active job count
    const userActiveCount = await redis.scard(USER_JOBS_KEY(userId));
    
    if (userActiveCount >= maxConcurrent) {
      return {
        allowed: false,
        reason: `Maximum ${maxConcurrent} concurrent export(s) allowed for your plan`,
        currentActive: userActiveCount,
        maxAllowed: maxConcurrent,
      };
    }
    
    // Check global limits
    const globalActiveCount = await redis.scard(GLOBAL_JOBS_KEY);
    
    if (globalActiveCount >= GLOBAL_LIMITS.maxConcurrent) {
      return {
        allowed: false,
        reason: 'Export queue is currently at capacity. Please try again later.',
        currentActive: userActiveCount,
        maxAllowed: maxConcurrent,
      };
    }
    
    return {
      allowed: true,
      currentActive: userActiveCount,
      maxAllowed: maxConcurrent,
    };
  } catch (error) {
    logger.error({ userId, error }, 'Failed to check export concurrency');
    // Fail open - allow export if Redis check fails
    return {
      allowed: true,
      currentActive: 0,
      maxAllowed: maxConcurrent,
    };
  }
}

/**
 * Register a new active export job
 */
export async function registerActiveJob(
  userId: string,
  jobId: string
): Promise<void> {
  try {
    // Add to user's active jobs set (with 2hr expiry for safety)
    await redis.sadd(USER_JOBS_KEY(userId), jobId);
    await redis.expire(USER_JOBS_KEY(userId), 7200); // 2 hours
    
    // Add to global active jobs set
    await redis.sadd(GLOBAL_JOBS_KEY, jobId);
    await redis.expire(GLOBAL_JOBS_KEY, 7200);
    
    logger.debug({ userId, jobId }, 'Registered active export job');
  } catch (error) {
    logger.error({ userId, jobId, error }, 'Failed to register active job');
  }
}

/**
 * Unregister an export job (completed, failed, or cancelled)
 */
export async function unregisterActiveJob(
  userId: string,
  jobId: string
): Promise<void> {
  try {
    await redis.srem(USER_JOBS_KEY(userId), jobId);
    await redis.srem(GLOBAL_JOBS_KEY, jobId);
    
    logger.debug({ userId, jobId }, 'Unregistered active export job');
  } catch (error) {
    logger.error({ userId, jobId, error }, 'Failed to unregister active job');
  }
}

/**
 * Get user's current active job count
 */
export async function getUserActiveJobCount(userId: string): Promise<number> {
  try {
    return await redis.scard(USER_JOBS_KEY(userId));
  } catch {
    return 0;
  }
}

/**
 * Get global active job count
 */
export async function getGlobalActiveJobCount(): Promise<number> {
  try {
    return await redis.scard(GLOBAL_JOBS_KEY);
  } catch {
    return 0;
  }
}

/**
 * Get user's active job IDs
 */
export async function getUserActiveJobs(userId: string): Promise<string[]> {
  try {
    return await redis.smembers(USER_JOBS_KEY(userId));
  } catch {
    return [];
  }
}
