/**
 * @module trending/__tests__/unit/scraper.test
 * @description Unit tests for combined YouTube + Google Trends scraping behavior.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { dailyTrendsMock, relatedTopicsMock } = vi.hoisted(() => ({
  dailyTrendsMock: vi.fn(),
  relatedTopicsMock: vi.fn(),
}));

vi.mock('google-trends-api', () => ({
  default: {
    dailyTrends: dailyTrendsMock,
    relatedTopics: relatedTopicsMock,
  },
}));

import { youtubeScraper } from '../../scrapers/youtube.scraper';

describe('youtube scraper', () => {
  const originalFetch = global.fetch;
  const originalYoutubeApiKey = process.env.YOUTUBE_API_KEY;
  const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
    <rss version="2.0" xmlns:ht="https://trends.google.com/trends/hottrends">
      <channel>
        <item>
          <title>topik viral</title>
          <ht:approx_traffic>200K+</ht:approx_traffic>
          <ht:picture>https://example.com/rss.jpg</ht:picture>
          <ht:news_item_title>Artikel Viral</ht:news_item_title>
          <ht:news_item_snippet>Ringkasan artikel viral</ht:news_item_snippet>
          <ht:news_item_url>https://example.com/article</ht:news_item_url>
        </item>
      </channel>
    </rss>`;

  beforeEach(() => {
    process.env.YOUTUBE_API_KEY = 'test-key';

    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
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
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () => rssXml,
      }) as typeof fetch;

    dailyTrendsMock.mockResolvedValue(
      JSON.stringify({
        default: {
          trendingSearchesDays: [
            {
              date: '2026-03-28',
              trendingSearches: [
                {
                  title: {
                    query: 'topik viral',
                    exploreLink: '/trends/explore?q=topik+viral',
                  },
                  formattedTraffic: '200K+',
                  relatedQueries: [{ query: 'viral hari ini' }],
                  articles: [
                    {
                      title: 'Artikel Viral',
                      timeAgo: '1 jam lalu',
                      source: 'Portal',
                      url: 'https://example.com/article',
                      snippet: 'Ringkasan artikel viral',
                    },
                  ],
                },
              ],
            },
          ],
        },
      }),
    );

    relatedTopicsMock.mockResolvedValue(
      JSON.stringify({
        default: {
          rankedList: [
            {
              rankedKeyword: [
                {
                  topic: {
                    title: 'Drama Korea',
                    type: 'Entertainment',
                  },
                  value: 87,
                  formattedValue: 'Breakout',
                  link: '/trends/explore?q=Drama+Korea',
                },
              ],
            },
          ],
        },
      }),
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
    global.fetch = originalFetch;

    if (originalYoutubeApiKey === undefined) {
      delete process.env.YOUTUBE_API_KEY;
    } else {
      process.env.YOUTUBE_API_KEY = originalYoutubeApiKey;
    }
  });

  it('combines youtube videos with google trends rss searches and related topics', async () => {
    const result = await youtubeScraper.scrape('ID');

    expect(result.status).toBe('ok');
    expect(result.items.some((item) => item.type === 'VIDEO')).toBe(true);
    expect(result.items.some((item) => item.type === 'SEARCH')).toBe(true);
    expect(result.items.some((item) => item.type === 'TOPIC')).toBe(true);
    expect(dailyTrendsMock).not.toHaveBeenCalled();
  });

  it('falls back to legacy daily trends when rss returns no items', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
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
      })
      .mockResolvedValueOnce({
        ok: false,
        text: async () => '',
      })
      .mockResolvedValueOnce({
        ok: false,
        text: async () => '',
      })
      .mockResolvedValueOnce({
        ok: false,
        text: async () => '',
      }) as typeof fetch;

    const result = await youtubeScraper.scrape('ID');

    expect(result.status).toBe('ok');
    expect(result.items.some((item) => item.type === 'SEARCH')).toBe(true);
    expect(dailyTrendsMock).toHaveBeenCalledOnce();
  });
});
