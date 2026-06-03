/**
 * YouTube scraper for video-first trending ideas.
 */

import { env } from '@/config/env';
import { logger } from '@/lib/logger';
import { PLATFORM_STATUS, TRENDING_TYPES } from '../trending.constants';
import type { ScrapedItem, ScraperResult } from '../trending.schema';
import { YOUTUBE_DEGRADED_SNAPSHOT_ITEMS } from './youtube-snapshot';
import { CATEGORY_MAP, YOUTUBE_VIDEOS_URL } from './youtube-source-config';

interface YouTubeApiVideo {
  readonly id: string;
  readonly snippet: {
    readonly title: string;
    readonly channelTitle: string;
    readonly categoryId: string;
    readonly thumbnails?: {
      readonly high?: { readonly url: string };
      readonly medium?: { readonly url: string };
    };
  };
  readonly statistics?: {
    readonly viewCount?: string;
    readonly likeCount?: string;
  };
}

interface YouTubeApiResponse {
  readonly items?: readonly YouTubeApiVideo[];
}

function buildYouTubeMostPopularUrl(region: string): string | null {
  if (!env.YOUTUBE_API_KEY) {
    return null;
  }

  const params = new URLSearchParams({
    part: 'snippet,statistics',
    chart: 'mostPopular',
    regionCode: region,
    maxResults: '50',
    key: env.YOUTUBE_API_KEY,
  });

  return `${YOUTUBE_VIDEOS_URL}?${params.toString()}`;
}

function mapYouTubeVideo(video: YouTubeApiVideo, index: number): ScrapedItem {
  const viewCount = Number.parseInt(video.statistics?.viewCount ?? '0', 10);
  const likeCount = Number.parseInt(video.statistics?.likeCount ?? '0', 10);

  return {
    externalId: `yt-${video.id}`,
    externalUrl: `https://www.youtube.com/watch?v=${video.id}`,
    title: video.snippet.title,
    description: video.snippet.channelTitle,
    thumbnailUrl: video.snippet.thumbnails?.high?.url || video.snippet.thumbnails?.medium?.url,
    rank: index + 1,
    metrics: {
      traffic: viewCount.toLocaleString(),
      value: likeCount,
    },
    category: CATEGORY_MAP[video.snippet.categoryId] || 'Entertainment',
    type: TRENDING_TYPES.VIDEO,
  };
}

async function fetchOfficialYoutubeVideos(region: string): Promise<ScrapedItem[]> {
  const requestUrl = buildYouTubeMostPopularUrl(region);
  if (!requestUrl) {
    return [];
  }

  try {
    const response = await fetch(requestUrl);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`YouTube API Error ${response.status}: ${errorText}`);
    }

    const data = (await response.json()) as YouTubeApiResponse;
    return (data.items ?? []).map((video, index) => mapYouTubeVideo(video, index));
  } catch (error) {
    logger.warn({ error }, 'Official YouTube API failed');
    return [];
  }
}

export const youtubeScraper = {
  /**
   * Scrape video-first trending data from YouTube only.
   */
  async scrape(region: string): Promise<ScraperResult> {
    try {
      const youtubeItems = await fetchOfficialYoutubeVideos(region);

      if (youtubeItems.length > 0) {
        return {
          status: PLATFORM_STATUS.OK,
          items: youtubeItems,
        };
      }

      throw new Error('YouTube source returned no items');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Scraping failed';
      logger.warn({ error }, 'YouTube trending scrape failed, returning degraded snapshot');

      return {
        status: PLATFORM_STATUS.DEGRADED,
        items: [...YOUTUBE_DEGRADED_SNAPSHOT_ITEMS],
        error: errorMessage,
      };
    }
  },
};
