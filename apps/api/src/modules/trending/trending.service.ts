/**
 * Trending Service
 * ============================================================================
 * Business logic for trending feature
 */

import {
  getTrendingRegionLabel,
  TRENDING_MAX_RESULTS,
  type TrendingRegionCode,
} from '@vibe-creator/shared';
import { logger } from '@/lib/logger';
import { redis } from '@/lib/redis';
import { youtubeScraper } from './scrapers/youtube.scraper';
import {
  CACHE_CONFIG,
  PLATFORM_STATUS,
  type PlatformStatus,
  REFRESH_COOLDOWN_SECONDS,
  STATUS_WINDOW,
} from './trending.constants';
import { trendingRepository } from './trending.repository';
import {
  CursorSchema,
  type TrendingItem,
  TrendingListResponseSchema,
  type TrendingQuery,
  type TrendingStatus,
  TrendingTypeSchema,
} from './trending.schema';

const REDIS_SCAN_START_CURSOR = '0';
const REDIS_SCAN_COUNT = 100;

// ============================================================================
// CACHE HELPERS
// ============================================================================

function getCacheKey(params: {
  region: string;
  limit: number;
  type?: string;
  category?: string;
}): string {
  const { region, limit, type, category } = params;
  const parts = [CACHE_CONFIG.KEY_PREFIX, region, type ?? 'all', `limit:${limit}`];
  if (category) {
    parts.push(`cat:${category}`);
  }
  return parts.join(':');
}

function isRedisReady(): boolean {
  return redis.status === 'ready';
}

async function getCachedValue(key: string): Promise<string | null> {
  if (!isRedisReady()) {
    return null;
  }

  try {
    return await redis.get(key);
  } catch (error) {
    logger.warn({ error, key }, 'Trending cache read failed, falling back to database');
    return null;
  }
}

function parseCachedResult(cached: string) {
  try {
    const parsed = JSON.parse(cached) as unknown;
    return TrendingListResponseSchema.parse({ success: true, data: parsed }).data;
  } catch (error) {
    logger.warn({ error }, 'Trending cache payload invalid, falling back to database');
    return null;
  }
}

function normalizeMetrics(metrics: unknown): Record<string, unknown> {
  if (metrics && typeof metrics === 'object' && !Array.isArray(metrics)) {
    return metrics as Record<string, unknown>;
  }

  return {};
}

function getLatestUpdateTimestamp(
  items: readonly TrendingItem[],
  status: TrendingStatus,
): string | null {
  return items[0]?.fetchedAt ?? status.lastSuccessAt;
}

async function setCachedValue(key: string, value: string, ttlSeconds: number): Promise<void> {
  if (!isRedisReady()) {
    return;
  }

  try {
    await redis.set(key, value, 'EX', ttlSeconds);
  } catch (error) {
    logger.warn({ error, key }, 'Trending cache write failed');
  }
}

async function deleteCachedValuesByPattern(pattern: string): Promise<void> {
  if (!isRedisReady()) {
    return;
  }

  try {
    let cursor = REDIS_SCAN_START_CURSOR;

    do {
      const [nextCursor, keys] = await redis.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        REDIS_SCAN_COUNT,
      );

      if (keys.length > 0) {
        await redis.del(...keys);
      }

      cursor = nextCursor;
    } while (cursor !== REDIS_SCAN_START_CURSOR);
  } catch (error) {
    logger.warn({ error, pattern }, 'Trending cache invalidation failed');
  }
}

async function cacheKeyExists(key: string): Promise<boolean> {
  if (!isRedisReady()) {
    return false;
  }

  try {
    return (await redis.exists(key)) === 1;
  } catch (error) {
    logger.warn({ error, key }, 'Trending cooldown check failed, allowing request');
    return false;
  }
}

// ============================================================================
// SERVICE
// ============================================================================

export const trendingService = {
  /**
   * Get trending items with caching (first page only, including filtered)
   */
  async getItems(query: TrendingQuery) {
    const { type, category, region, limit, cursor } = query;

    // Cache first page (no cursor) - including filtered results
    if (!cursor) {
      const cacheKey = getCacheKey({ region, limit, type, category });
      const cached = await getCachedValue(cacheKey);
      if (cached) {
        const parsed = parseCachedResult(cached);
        if (parsed) {
          return parsed;
        }
      }
    }

    // Parse cursor if provided
    let parsedCursor: { fetchedAt: Date; id: string; rank: number | null } | undefined;
    if (cursor) {
      try {
        const decoded = CursorSchema.parse(JSON.parse(Buffer.from(cursor, 'base64url').toString()));
        parsedCursor = {
          fetchedAt: new Date(decoded.fetchedAt),
          id: decoded.id,
          rank: decoded.rank ?? null,
        };
      } catch {
        // Invalid cursor, ignore
      }
    }

    // Fetch from database with category filter
    const { items, nextCursor } = await trendingRepository.getItems({
      type,
      category,
      region,
      limit,
      cursor: parsedCursor,
    });

    // Get platform status
    const status = await this.getStatus(region);

    const mappedItems: TrendingItem[] = items.map((item) => ({
      id: item.id,
      platform: item.platform,
      type: TrendingTypeSchema.parse(item.type),
      title: item.title,
      description: item.description,
      thumbnailUrl: item.thumbnailUrl,
      externalUrl: item.externalUrl,
      rank: item.rank,
      metrics: normalizeMetrics(item.metrics),
      category: item.category,
      region,
      fetchedAt: item.fetchedAt.toISOString(),
    }));

    const result = {
      items: mappedItems,
      nextCursor: nextCursor ? Buffer.from(JSON.stringify(nextCursor)).toString('base64url') : null,
      status,
      metadata: {
        maxResults: TRENDING_MAX_RESULTS,
        returnedCount: mappedItems.length,
        regionLabel: getTrendingRegionLabel(region),
        lastUpdatedAt: getLatestUpdateTimestamp(mappedItems, status),
      },
    };

    // Cache first page (including filtered results)
    if (!cursor && items.length > 0) {
      const cacheKey = getCacheKey({ region, limit, type, category });
      await setCachedValue(cacheKey, JSON.stringify(result), CACHE_CONFIG.FIRST_PAGE_TTL_SECONDS);
    }

    return result;
  },

  /**
   * Get platform status with derivation logic
   */
  async getStatus(region: TrendingRegionCode): Promise<TrendingStatus> {
    const dbStatus = await trendingRepository.getStatus('YOUTUBE', region);

    if (!dbStatus) {
      return {
        platform: 'YOUTUBE',
        region,
        status: PLATFORM_STATUS.DOWN,
        lastSuccessAt: null,
      };
    }

    if (dbStatus.status !== PLATFORM_STATUS.OK && !dbStatus.lastSuccessAt) {
      const storedStatus =
        dbStatus.status === PLATFORM_STATUS.DEGRADED
          ? PLATFORM_STATUS.DEGRADED
          : PLATFORM_STATUS.DOWN;

      return {
        platform: 'YOUTUBE',
        region,
        status: storedStatus,
        lastSuccessAt: null,
      };
    }

    // Derive status based on last success time
    const now = Date.now();
    const lastSuccess = dbStatus.lastSuccessAt?.getTime() ?? 0;
    const hoursSinceSuccess = (now - lastSuccess) / (60 * 60 * 1000);

    let derivedStatus: PlatformStatus;
    if (hoursSinceSuccess <= STATUS_WINDOW.OK_HOURS) {
      derivedStatus = PLATFORM_STATUS.OK;
    } else if (hoursSinceSuccess <= STATUS_WINDOW.DEGRADED_HOURS) {
      derivedStatus = PLATFORM_STATUS.DEGRADED;
    } else {
      derivedStatus = PLATFORM_STATUS.DOWN;
    }

    return {
      platform: 'YOUTUBE',
      region,
      status: derivedStatus,
      lastSuccessAt: dbStatus.lastSuccessAt?.toISOString() ?? null,
    };
  },

  /**
   * Check if refresh is allowed (cooldown not active)
   */
  async canRefresh(region: TrendingRegionCode): Promise<boolean> {
    const key = `trending:cooldown:${region}`;
    return !(await cacheKeyExists(key));
  },

  /**
   * Set refresh cooldown
   */
  async setRefreshCooldown(region: TrendingRegionCode): Promise<void> {
    const key = `trending:cooldown:${region}`;
    await setCachedValue(key, '1', REFRESH_COOLDOWN_SECONDS);
  },

  /**
   * Invalidate first-page cache after successful refresh
   */
  async invalidateCache(region: TrendingRegionCode): Promise<void> {
    await deleteCachedValuesByPattern(`${CACHE_CONFIG.KEY_PREFIX}:${region}:*`);
  },

  /**
   * Execute refresh (called by job processor)
   */
  async executeRefresh(
    region: TrendingRegionCode,
    _mode: 'quick' | 'full',
  ): Promise<{
    status: 'ok' | 'degraded' | 'down';
    itemCount: number;
    error?: string;
  }> {
    try {
      const result = await youtubeScraper.scrape(region);

      if (result.status === 'down') {
        await trendingRepository.updateStatus('YOUTUBE', region, 'down', result.error);
        return { status: 'down', itemCount: 0, error: result.error };
      }

      const upsertedCount = await trendingRepository.upsertItems(result.items, 'YOUTUBE', region);

      await trendingRepository.updateStatus('YOUTUBE', region, result.status, result.error);
      await this.invalidateCache(region);

      return { status: result.status, itemCount: upsertedCount, error: result.error };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      await trendingRepository.updateStatus('YOUTUBE', region, 'down', errorMessage);
      return { status: 'down', itemCount: 0, error: errorMessage };
    }
  },

  /**
   * Cleanup expired items
   */
  async cleanupExpired(): Promise<number> {
    return trendingRepository.deleteExpired();
  },
};
