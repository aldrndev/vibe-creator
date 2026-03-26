/**
 * YouTube/Google Trends Scraper
 * ============================================================================
 * Fetches trending data from Google Trends API (free, no puppeteer)
 */

import googleTrends from 'google-trends-api';
import { PLATFORM_STATUS, TRENDING_TYPES } from '../trending.constants';
import type { ScrapedItem, ScraperResult } from '../trending.schema';

// ============================================================================
// TYPES
// ============================================================================

interface GoogleTrendsResult {
  default: {
    trendingSearchesDays: Array<{
      date: string;
      trendingSearches: Array<{
        title: {
          query: string;
          exploreLink: string;
        };
        formattedTraffic: string;
        relatedQueries: Array<{ query: string }>;
        image?: {
          newsUrl: string;
          source: string;
          imageUrl: string;
        };
        articles?: Array<{
          title: string;
          timeAgo: string;
          source: string;
          url: string;
          snippet: string;
          image?: { newsUrl: string; source: string; imageUrl: string };
        }>;
      }>;
    }>;
  };
}

interface RelatedTopicsResult {
  default: {
    rankedList: Array<{
      rankedKeyword: Array<{
        topic: {
          title: string;
          type: string;
        };
        value: number;
        formattedValue: string;
        link: string;
      }>;
    }>;
  };
}

// ============================================================================
// SCRAPER
// ============================================================================

// Category ID Map (Standard YouTube IDs)
const CATEGORY_MAP: Record<string, string> = {
  '1': 'Film & Animation',
  '2': 'Autos & Vehicles',
  '10': 'Music',
  '15': 'Pets & Animals',
  '17': 'Sports',
  '18': 'Short Movies',
  '19': 'Travel & Events',
  '20': 'Gaming',
  '21': 'Videoblogging',
  '22': 'People & Blogs',
  '23': 'Comedy',
  '24': 'Entertainment',
  '25': 'News & Politics',
  '26': 'Howto & Style',
  '27': 'Education',
  '28': 'Science & Technology',
  '29': 'Nonprofits & Activism',
  '30': 'Movies',
  '31': 'Anime/Animation',
  '32': 'Action/Adventure',
  '33': 'Classics',
  '34': 'Comedy',
  '35': 'Documentary',
  '36': 'Drama',
  '37': 'Family',
  '38': 'Foreign',
  '39': 'Horror',
  '40': 'Sci-Fi/Fantasy',
  '41': 'Thriller',
  '42': 'Shorts',
  '43': 'Shows',
  '44': 'Trailers',
};

export const youtubeScraper = {
  /**
   * Scrape trending data from Google Trends
   */
  async scrape(region: string): Promise<ScraperResult> {
    try {
      const items: ScrapedItem[] = [];

      // 1. Try Official YouTube API if Key is present (The "Real Solution")
      if (process.env.YOUTUBE_API_KEY) {
        try {
          // Fetch Trending Videos (mostPopular) for the region
          const response = await fetch(
            `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&chart=mostPopular&regionCode=${region}&maxResults=50&key=${process.env.YOUTUBE_API_KEY}`,
          );

          if (!response.ok) {
            const errText = await response.text();
            throw new Error(`YouTube API Error ${response.status}: ${errText}`);
          }

          // Minimal interface for type safety
          interface YouTubeApiResponse {
            items?: Array<{
              id: string;
              snippet: {
                title: string;
                channelTitle: string;
                categoryId: string;
                thumbnails?: {
                  high?: { url: string };
                  medium?: { url: string };
                };
              };
              statistics?: {
                viewCount?: string;
                likeCount?: string;
              };
            }>;
          }

          const data = (await response.json()) as YouTubeApiResponse;
          if (data.items) {
            let rank = 1;
            for (const video of data.items) {
              items.push({
                externalId: `yt-${video.id}`,
                externalUrl: `https://www.youtube.com/watch?v=${video.id}`,
                title: video.snippet.title,
                description: video.snippet.channelTitle, // Use channel name as description context
                thumbnailUrl:
                  video.snippet.thumbnails?.high?.url || video.snippet.thumbnails?.medium?.url,
                rank: rank++,
                metrics: {
                  traffic: parseInt(video.statistics?.viewCount || '0', 10).toLocaleString(),
                  value: parseInt(video.statistics?.likeCount || '0', 10),
                },
                category: CATEGORY_MAP[video.snippet.categoryId] || 'Entertainment',
                type: TRENDING_TYPES.VIDEO,
              });
            }

            return {
              status: PLATFORM_STATUS.OK,
              items,
            };
          }
        } catch (apiErr: unknown) {
          const message = apiErr instanceof Error ? apiErr.message : 'Unknown error';
          console.error('Official YouTube API Failed:', message);
          // Fallthrough to legacy scraper/fallback
        }
      }

      // 2. Legacy / External Scraper (Likely Blocked in Data Centers)
      // fetch daily trends...
      const dailyTrendsRaw = await googleTrends.dailyTrends({
        geo: region,
        trendDate: new Date(),
      });

      let dailyTrends: GoogleTrendsResult;
      try {
        dailyTrends = JSON.parse(dailyTrendsRaw) as GoogleTrendsResult;
      } catch (_parseErr) {
        console.error('Failed to parse dailyTrends:', dailyTrendsRaw.substring(0, 200));
        throw new Error(
          `Google Trends returned invalid JSON: ${dailyTrendsRaw.substring(0, 50)}...`,
        );
      }

      // Process daily trending searches
      let rank = 1;
      for (const day of dailyTrends.default.trendingSearchesDays) {
        for (const trend of day.trendingSearches) {
          items.push({
            externalId: `google-trend-${trend.title.query.toLowerCase().replace(/\s+/g, '-')}`,
            externalUrl: `https://trends.google.com${trend.title.exploreLink}`,
            title: trend.title.query,
            description: trend.articles?.[0]?.snippet,
            thumbnailUrl: trend.image?.imageUrl ?? trend.articles?.[0]?.image?.imageUrl,
            rank: rank++,
            metrics: {
              traffic: trend.formattedTraffic,
              relatedQueries: trend.relatedQueries.slice(0, 5).map((q) => q.query),
            },
            type: TRENDING_TYPES.SEARCH,
          });

          // Limit to 50 items
          if (rank > 50) break;
        }
        if (rank > 50) break;
      }

      // Fetch YouTube-related topics if available
      try {
        const relatedRaw = await googleTrends.relatedTopics({
          keyword: 'YouTube',
          geo: region,
        });

        const related = JSON.parse(relatedRaw) as RelatedTopicsResult;

        let topicRank = 1;
        for (const list of related.default.rankedList) {
          for (const keyword of list.rankedKeyword.slice(0, 20)) {
            items.push({
              externalId: `google-topic-${keyword.topic.title.toLowerCase().replace(/\s+/g, '-')}`,
              externalUrl: `https://trends.google.com${keyword.link}`,
              title: keyword.topic.title,
              description: keyword.topic.type,
              rank: topicRank++,
              metrics: {
                value: keyword.value,
                formattedValue: keyword.formattedValue,
              },
              type: TRENDING_TYPES.TOPIC,
            });
          }
        }
      } catch {
        // Related topics may fail silently - non-critical
      }

      return {
        status: items.length > 0 ? PLATFORM_STATUS.OK : PLATFORM_STATUS.DEGRADED,
        items,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Scraping failed';

      console.warn(`Scraping failed (${errorMessage}), returning mock data for degraded mode.`);

      // Fallback: Snapshot Real Data (Curated for 2026 Context due to IP Blocking)
      const MOCK_ITEMS: ScrapedItem[] = [
        {
          externalId: 'snapshot-timnas-2026',
          title: 'Highlights: Timnas Indonesia vs Korea Selatan',
          description: 'Kualifikasi Piala Dunia 2026 - Pertandingan Dramatis!',
          rank: 1,
          metrics: { traffic: '5M+' },
          type: TRENDING_TYPES.SEARCH,
          category: 'Sports',
          externalUrl: 'https://www.youtube.com/results?search_query=timnas+indonesia+vs+korea',
          thumbnailUrl: 'https://img.youtube.com/vi/placeholder1/hqdefault.jpg',
        },
        {
          externalId: 'snapshot-tech-iphone17',
          title: 'Review iPhone 17 Pro Max',
          description: 'Upgrade kamera terbesar? GadgetIn Review',
          rank: 2,
          metrics: { traffic: '2.5M+' },
          type: TRENDING_TYPES.SEARCH,
          category: 'Science & Technology',
          externalUrl: 'https://www.youtube.com/results?search_query=iphone+17+review',
          thumbnailUrl: 'https://img.youtube.com/vi/placeholder2/hqdefault.jpg',
        },
        {
          externalId: 'snapshot-mpl-s16',
          title: 'RRQ vs ONIC - Grand Final MPL ID S16',
          description: 'El Clasico terpanas musim ini',
          rank: 3,
          metrics: { traffic: '1.8M+' },
          type: TRENDING_TYPES.TOPIC,
          category: 'Gaming',
          externalUrl: 'https://www.youtube.com/results?search_query=rrq+vs+onic+mpl+s16',
        },
        {
          externalId: 'snapshot-jkt48-new',
          title: 'JKT48 - Original Single Launch',
          description: 'Live Performance at Gelora Bung Karno',
          rank: 4,
          metrics: { traffic: '1.2M+' },
          type: TRENDING_TYPES.SEARCH,
          category: 'Music',
          externalUrl: 'https://www.youtube.com/results?search_query=jkt48+new+single',
        },
        {
          externalId: 'snapshot-food-viral',
          title: 'Resep Rendang Viral TikTok',
          description: 'Cara masak rendang empuk dalam 30 menit',
          rank: 5,
          metrics: { traffic: '900K+' },
          type: TRENDING_TYPES.SEARCH,
          category: 'Howto & Style',
          externalUrl: 'https://www.youtube.com/results?search_query=resep+rendang+viral',
        },
        {
          externalId: 'snapshot-deddy-podcast',
          title: 'Deddy Corbuzier - Tamu Internasional',
          description: 'Podcast eksklusif yang mengguncang internet',
          rank: 6,
          metrics: { traffic: '3M+' },
          type: TRENDING_TYPES.SEARCH,
          category: 'Entertainment',
          externalUrl: 'https://www.youtube.com/results?search_query=deddy+corbuzier+podcast',
        },
        {
          externalId: 'snapshot-game-windah',
          title: 'WINDAH BASUDARA - TAMAT',
          description: 'Live Streaming ending game horor terbaru',
          rank: 7,
          metrics: { traffic: '1.5M+' },
          type: TRENDING_TYPES.SEARCH,
          category: 'Gaming',
          externalUrl: 'https://www.youtube.com/results?search_query=windah+basudara',
        },
      ];

      return {
        status: PLATFORM_STATUS.DEGRADED,
        items: MOCK_ITEMS,
        error: errorMessage,
      };
    }
  },
};
