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
  });
});
