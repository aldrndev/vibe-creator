/**
 * Trending Service
 * ============================================================================
 * Business logic for trending feature
 */

import { redis } from '@/lib/redis';
import { youtubeScraper } from './scrapers/youtube.scraper';
import {
  CACHE_CONFIG,
  PLATFORM_STATUS,
  REFRESH_COOLDOWN_SECONDS,
  STATUS_WINDOW,
} from './trending.constants';
import { trendingRepository } from './trending.repository';
import type { TrendingQuery, TrendingStatus } from './trending.schema';

// ============================================================================
// CACHE HELPERS
// ============================================================================

function getCacheKey(region: string, type?: string, category?: string): string {
  const parts = [CACHE_CONFIG.KEY_PREFIX, region, type ?? 'all'];
  if (category) {
    parts.push(`cat:${category}`);
  }
  return parts.join(':');
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
      const cacheKey = getCacheKey(region, type, category);
      const cached = await redis.get(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        return parsed;
      }
    }

    // Parse cursor if provided
    let parsedCursor: { fetchedAt: Date; id: string } | undefined;
    if (cursor) {
      try {
        const decoded = JSON.parse(Buffer.from(cursor, 'base64url').toString());
        parsedCursor = {
          fetchedAt: new Date(decoded.fetchedAt),
          id: decoded.id,
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

    const result = {
      items: items.map(
        (item: {
          id: string;
          platform: string;
          type: string;
          title: string;
          description: string | null;
          thumbnailUrl: string | null;
          externalUrl: string | null;
          rank: number | null;
          metrics: unknown;
          category: string | null;
          region: string;
          fetchedAt: Date;
        }) => ({
          id: item.id,
          platform: item.platform,
          type: item.type,
          title: item.title,
          description: item.description,
          thumbnailUrl: item.thumbnailUrl,
          externalUrl: item.externalUrl,
          rank: item.rank,
          metrics: item.metrics,
          category: item.category,
          region: item.region,
          fetchedAt: item.fetchedAt.toISOString(),
        }),
      ),
      nextCursor: nextCursor ? Buffer.from(JSON.stringify(nextCursor)).toString('base64url') : null,
      status,
    };

    // Cache first page (including filtered results)
    if (!cursor && items.length > 0) {
      const cacheKey = getCacheKey(region, type, category);
      await redis.set(cacheKey, JSON.stringify(result), 'EX', CACHE_CONFIG.FIRST_PAGE_TTL_SECONDS);
    }

    return result;
  },

  /**
   * Get platform status with derivation logic
   */
  async getStatus(region: string): Promise<TrendingStatus> {
    const dbStatus = await trendingRepository.getStatus('YOUTUBE', region);

    if (!dbStatus) {
      return {
        platform: 'YOUTUBE',
        region,
        status: PLATFORM_STATUS.DOWN,
        lastSuccessAt: null,
      };
    }

    // Derive status based on last success time
    const now = Date.now();
    const lastSuccess = dbStatus.lastSuccessAt?.getTime() ?? 0;
    const hoursSinceSuccess = (now - lastSuccess) / (60 * 60 * 1000);

    let derivedStatus: 'ok' | 'degraded' | 'down';
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
  async canRefresh(region: string): Promise<boolean> {
    const key = `trending:cooldown:${region}`;
    const exists = await redis.exists(key);
    return exists === 0;
  },

  /**
   * Set refresh cooldown
   */
  async setRefreshCooldown(region: string): Promise<void> {
    const key = `trending:cooldown:${region}`;
    await redis.set(key, '1', 'EX', REFRESH_COOLDOWN_SECONDS);
  },

  /**
   * Invalidate first-page cache after successful refresh
   */
  async invalidateCache(region: string): Promise<void> {
    const patterns = [
      getCacheKey(region, undefined),
      getCacheKey(region, 'HASHTAG'),
      getCacheKey(region, 'TOPIC'),
      getCacheKey(region, 'SEARCH'),
      getCacheKey(region, 'VIDEO'),
    ];

    for (const key of patterns) {
      await redis.del(key);
    }
  },

  /**
   * Execute refresh (called by job processor)
   */
  async executeRefresh(
    region: string,
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

      await trendingRepository.updateStatus('YOUTUBE', region, 'ok');
      await this.invalidateCache(region);

      return { status: 'ok', itemCount: upsertedCount };
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
