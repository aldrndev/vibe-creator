/**
 * Trending Repository
 * ============================================================================
 * Database access layer for trending items
 */

import { createHash } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { DATA_EXPIRY_HOURS, RETENTION_CONFIG } from './trending.constants';
import type { ScrapedItem } from './trending.schema';

// ============================================================================
// HASH UTILITY
// ============================================================================

/**
 * Generate deterministic hash for deduplication
 */
export function generateExternalUrlHash(externalId: string, externalUrl?: string): string {
  const input = externalUrl ?? externalId;
  return createHash('sha256').update(input).digest('hex');
}

// ============================================================================
// DATA SANITIZATION
// ============================================================================

/**
 * Sanitize text from external sources
 * Strips control characters, HTML tags, and enforces max length
 */
export function sanitizeText(input: string, maxLength: number): string {
  return input
    .split('')
    .filter((char) => {
      const code = char.charCodeAt(0);
      return code > 31 && code !== 127;
    })
    .join('')
    .replace(/<[^>]*>/g, '') // Strip HTML tags
    .trim()
    .slice(0, maxLength);
}

// ============================================================================
// REPOSITORY
// ============================================================================

export const trendingRepository = {
  /**
   * Upsert trending items (dedupe by unique constraint)
   */
  async upsertItems(items: ScrapedItem[], platform: string, region: string): Promise<number> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + DATA_EXPIRY_HOURS * 60 * 60 * 1000);
    let upsertedCount = 0;

    for (const item of items) {
      const externalUrlHash = generateExternalUrlHash(item.externalId, item.externalUrl);

      await prisma.trendingItem.upsert({
        where: {
          trending_items_unique: {
            platform,
            type: item.type,
            region,
            externalUrlHash,
          },
        },
        update: {
          title: sanitizeText(item.title, 200),
          description: item.description ? sanitizeText(item.description, 500) : null,
          thumbnailUrl: item.thumbnailUrl,
          externalUrl: item.externalUrl,
          rank: item.rank,
          metrics: (item.metrics ?? {}) as Prisma.JsonObject,
          category: item.category,
          fetchedAt: now, // Use consistent batch timestamp
          expiresAt,
        },
        create: {
          platform,
          type: item.type,
          externalId: item.externalId,
          externalUrlHash,
          title: sanitizeText(item.title, 200),
          description: item.description ? sanitizeText(item.description, 500) : null,
          thumbnailUrl: item.thumbnailUrl,
          externalUrl: item.externalUrl,
          rank: item.rank,
          metrics: (item.metrics ?? {}) as Prisma.JsonObject,
          category: item.category,
          region,
          fetchedAt: now, // Ensure created items also have the batch timestamp
          expiresAt,
        },
      });
      upsertedCount++;
    }

    return upsertedCount;
  },

  /**
   * Get trending items with cursor pagination
   * ORDER BY fetched_at DESC, rank ASC
   */
  async getItems(params: {
    type?: string;
    category?: string;
    region: string;
    limit: number;
    cursor?: { fetchedAt: Date; id: string };
  }) {
    const { type, category, region, limit, cursor } = params;

    const where = {
      region,
      expiresAt: { gt: new Date() },
      ...(type && { type }),
      ...(category && { category }), // Support category filtering
      ...(cursor && {
        OR: [
          { fetchedAt: { lt: cursor.fetchedAt } },
          {
            fetchedAt: cursor.fetchedAt,
            id: { lt: cursor.id },
          },
        ],
      }),
    };

    const items = await prisma.trendingItem.findMany({
      where,
      orderBy: [{ fetchedAt: 'desc' }, { rank: 'asc' }], // Sort by Rank ASC within the batch
      take: limit + 1, // Fetch one extra to check if there's a next page
    });

    const hasNextPage = items.length > limit;
    const results = hasNextPage ? items.slice(0, limit) : items;

    const lastItem = results[results.length - 1];
    const nextCursor =
      hasNextPage && lastItem
        ? {
            fetchedAt: lastItem.fetchedAt.toISOString(),
            id: lastItem.id,
          }
        : null;

    return { items: results, nextCursor };
  },

  /**
   * Get platform status
   */
  async getStatus(platform: string, region: string) {
    return prisma.trendingPlatformStatus.findUnique({
      where: {
        trending_platform_status_unique: { platform, region },
      },
    });
  },

  /**
   * Update platform status
   */
  async updateStatus(
    platform: string,
    region: string,
    status: 'ok' | 'degraded' | 'down',
    errorMessage?: string,
  ) {
    const now = new Date();
    return prisma.trendingPlatformStatus.upsert({
      where: {
        trending_platform_status_unique: { platform, region },
      },
      update: {
        status,
        ...(status === 'ok' && { lastSuccessAt: now }),
        ...(status !== 'ok' && { lastFailureAt: now, errorMessage }),
      },
      create: {
        platform,
        region,
        status,
        ...(status === 'ok' && { lastSuccessAt: now }),
        ...(status !== 'ok' && { lastFailureAt: now, errorMessage }),
      },
    });
  },

  /**
   * Delete expired items in batches
   */
  async deleteExpired(): Promise<number> {
    const cutoff = new Date(Date.now() - RETENTION_CONFIG.CLEANUP_AFTER_HOURS * 60 * 60 * 1000);

    const result = await prisma.trendingItem.deleteMany({
      where: {
        expiresAt: { lt: cutoff },
      },
    });

    return result.count;
  },
};
