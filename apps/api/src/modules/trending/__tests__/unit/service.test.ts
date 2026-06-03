/**
 * @module trending/__tests__/unit/service.test
 * @description Regression tests for trending service cache fallback behavior.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getItemsMock, getStatusMock, redisGetMock, redisSetMock, redisDelMock, redisExistsMock } =
  vi.hoisted(() => ({
    getItemsMock: vi.fn(),
    getStatusMock: vi.fn(),
    redisGetMock: vi.fn(),
    redisSetMock: vi.fn(),
    redisDelMock: vi.fn(),
    redisExistsMock: vi.fn(),
  }));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('@/lib/redis', () => ({
  redis: {
    status: 'ready',
    get: redisGetMock,
    set: redisSetMock,
    del: redisDelMock,
    exists: redisExistsMock,
  },
}));

vi.mock('../../trending.repository', () => ({
  trendingRepository: {
    getItems: getItemsMock,
    getStatus: getStatusMock,
    updateStatus: vi.fn(),
    upsertItems: vi.fn(),
    deleteExpired: vi.fn(),
  },
}));

vi.mock('../../scrapers/youtube.scraper', () => ({
  youtubeScraper: {
    scrape: vi.fn(),
  },
}));

import { redis } from '@/lib/redis';
import { trendingService } from '../../trending.service';

describe('trending service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    redis.status = 'ready';

    getItemsMock.mockResolvedValue({
      items: [
        {
          id: 'item-1',
          platform: 'YOUTUBE',
          type: 'VIDEO',
          title: 'Trending Video',
          description: 'Description',
          thumbnailUrl: 'https://example.com/thumb.jpg',
          externalUrl: 'https://example.com/video',
          rank: 1,
          metrics: { traffic: 1000 },
          category: 'Entertainment',
          region: 'ID',
          fetchedAt: new Date('2026-03-27T12:00:00.000Z'),
        },
      ],
      nextCursor: null,
    });

    getStatusMock.mockResolvedValue({
      platform: 'YOUTUBE',
      region: 'ID',
      status: 'ok',
      lastSuccessAt: new Date(),
    });
  });

  it('falls back to repository when redis is not ready', async () => {
    redis.status = 'connecting';

    const result = await trendingService.getItems({
      region: 'ID',
      limit: 20,
    });

    expect(redisGetMock).not.toHaveBeenCalled();
    expect(redisSetMock).not.toHaveBeenCalled();
    expect(getItemsMock).toHaveBeenCalledWith({
      type: undefined,
      category: undefined,
      region: 'ID',
      limit: 20,
      cursor: undefined,
    });
    expect(result.items).toHaveLength(1);
    expect(result.status.status).toBe('ok');
    expect(result.metadata).toMatchObject({
      maxResults: 50,
      returnedCount: 1,
      regionLabel: 'Indonesia',
      lastUpdatedAt: '2026-03-27T12:00:00.000Z',
    });
  });

  it('does not reuse a smaller cached first page for a larger limit request', async () => {
    const staleDefaultLimitResult = {
      items: Array.from({ length: 20 }, (_, index) => ({
        id: `cached-item-${index + 1}`,
        platform: 'YOUTUBE',
        type: 'VIDEO',
        title: `Cached Trending Video ${index + 1}`,
        description: 'Cached description',
        thumbnailUrl: 'https://example.com/cached-thumb.jpg',
        externalUrl: 'https://example.com/cached-video',
        rank: index + 1,
        metrics: { traffic: 1000 },
        category: 'Entertainment',
        region: 'ID',
        fetchedAt: '2026-03-27T12:00:00.000Z',
      })),
      nextCursor: null,
      status: {
        platform: 'YOUTUBE',
        region: 'ID',
        status: 'ok',
        lastSuccessAt: '2026-03-27T12:00:00.000Z',
      },
    };

    redisGetMock.mockImplementation((key: string) =>
      Promise.resolve(
        key === 'trending:v1:first:ID:all' ? JSON.stringify(staleDefaultLimitResult) : null,
      ),
    );

    const result = await trendingService.getItems({
      region: 'ID',
      limit: 50,
    });

    expect(getItemsMock).toHaveBeenCalledWith({
      type: undefined,
      category: undefined,
      region: 'ID',
      limit: 50,
      cursor: undefined,
    });
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.id).toBe('item-1');
    expect(result.metadata.returnedCount).toBe(1);
  });

  it('normalizes nullable database metrics before returning feed items', async () => {
    redisGetMock.mockResolvedValue(null);
    getItemsMock.mockResolvedValueOnce({
      items: [
        {
          id: 'item-with-null-metrics',
          platform: 'YOUTUBE',
          type: 'VIDEO',
          title: 'Trending Video With Null Metrics',
          description: 'Description',
          thumbnailUrl: 'https://example.com/thumb.jpg',
          externalUrl: 'https://example.com/video',
          rank: 21,
          metrics: null,
          category: 'Entertainment',
          region: 'ID',
          fetchedAt: new Date('2026-03-27T12:00:00.000Z'),
        },
      ],
      nextCursor: null,
    });

    const result = await trendingService.getItems({
      region: 'ID',
      limit: 50,
    });

    expect(result.items[0]?.metrics).toEqual({});
    expect(result.metadata.returnedCount).toBe(1);
  });

  it('decodes rank-aware cursors before fetching the next page', async () => {
    const cursorPayload = {
      fetchedAt: '2026-03-27T12:00:00.000Z',
      id: 'rank-30-id',
      rank: 30,
    };
    const cursor = Buffer.from(JSON.stringify(cursorPayload)).toString('base64url');

    await trendingService.getItems({
      region: 'ID',
      type: 'VIDEO',
      limit: 20,
      cursor,
    });

    expect(getItemsMock).toHaveBeenCalledWith({
      type: 'VIDEO',
      category: undefined,
      region: 'ID',
      limit: 20,
      cursor: {
        fetchedAt: new Date('2026-03-27T12:00:00.000Z'),
        id: 'rank-30-id',
        rank: 30,
      },
    });
  });
});
