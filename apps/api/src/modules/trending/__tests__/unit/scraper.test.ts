/**
 * @module trending/__tests__/unit/scraper.test
 * @description Unit tests for YouTube-first scraping behavior.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { envMock } = vi.hoisted(() => ({
  envMock: {
    YOUTUBE_API_KEY: 'test-key' as string | undefined,
  },
}));

vi.mock('@/config/env', () => ({
  env: envMock,
}));

import { youtubeScraper } from '../../scrapers/youtube.scraper';

describe('youtube scraper', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    envMock.YOUTUBE_API_KEY = 'test-key';

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [
          {
            id: 'abc123',
            snippet: {
              title: 'Video Viral Hari Ini',
              channelTitle: 'Kanal Viral',
              categoryId: '42',
              thumbnails: {
                high: { url: 'https://example.com/video.jpg' },
              },
            },
            statistics: {
              viewCount: '12000',
              likeCount: '500',
            },
          },
        ],
      }),
    }) as typeof fetch;
  });

  afterEach(() => {
    vi.clearAllMocks();
    global.fetch = originalFetch;
  });

  it('returns official youtube videos only', async () => {
    const result = await youtubeScraper.scrape('ID');

    expect(result.status).toBe('ok');
    expect(result.items).toHaveLength(1);
    expect(result.items.every((item) => item.type === 'VIDEO')).toBe(true);
    expect(result.items[0]?.externalUrl).toBe('https://www.youtube.com/watch?v=abc123');
  });

  it('falls back to youtube degraded snapshot when youtube returns no items', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: [] }),
    }) as typeof fetch;

    const result = await youtubeScraper.scrape('ID');

    expect(result.status).toBe('degraded');
    expect(result.items.length).toBeGreaterThan(0);
    expect(result.items.every((item) => item.type === 'VIDEO')).toBe(true);
  });

  it('does not call external sources when youtube api key is not configured', async () => {
    envMock.YOUTUBE_API_KEY = undefined;
    const fetchMock = vi.fn();
    global.fetch = fetchMock as typeof fetch;

    const result = await youtubeScraper.scrape('ID');

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.status).toBe('degraded');
    expect(result.items.every((item) => item.type === 'VIDEO')).toBe(true);
  });
});
