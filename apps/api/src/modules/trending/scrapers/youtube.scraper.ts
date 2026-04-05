/**
 * YouTube/Google Trends Scraper
 * ============================================================================
 * Fetches trending data from YouTube API and Google Trends sources
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

interface GoogleTrendsRssCandidate {
  readonly url: string;
  readonly locale?: string;
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

const GOOGLE_TRENDS_RSS_SOURCES: Record<string, readonly GoogleTrendsRssCandidate[]> = {
  ID: [
    { url: 'https://trends.google.com/trends/trendingsearches/daily/rss?geo=ID&hl=id' },
    { url: 'https://trends.google.com/trends/trendingsearches/daily/rss?geo=ID' },
    { url: 'https://trends.google.co.id/trends/trendingsearches/daily/rss?geo=ID' },
  ],
  US: [{ url: 'https://trends.google.com/trends/trendingsearches/daily/rss?geo=US&hl=en-US' }],
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function decodeXmlEntities(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function getXmlTagValue(block: string, tagName: string): string | undefined {
  const tagPattern = new RegExp(
    `<${escapeRegExp(tagName)}[^>]*>([\\s\\S]*?)</${escapeRegExp(tagName)}>`,
    'i',
  );
  const match = block.match(tagPattern);
  const value = match?.[1];

  if (!value) {
    return undefined;
  }

  return decodeXmlEntities(value);
}

function normalizeExternalId(prefix: string, value: string): string {
  return `${prefix}-${value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')}`;
}

function buildGoogleTrendsExploreUrl(query: string, region: string): string {
  return `https://trends.google.com/trends/explore?geo=${region}&q=${encodeURIComponent(query)}`;
}

function parseGoogleTrendsRss(xml: string, region: string): ScrapedItem[] {
  const itemBlocks = xml.match(/<item>[\s\S]*?<\/item>/gi) ?? [];

  return itemBlocks.reduce<ScrapedItem[]>((items, block, index) => {
    const title = getXmlTagValue(block, 'title');

    if (!title) {
      return items;
    }

    const traffic = getXmlTagValue(block, 'ht:approx_traffic');
    const thumbnailUrl = getXmlTagValue(block, 'ht:picture');
    const newsItemTitle = getXmlTagValue(block, 'ht:news_item_title');
    const newsItemSnippet = getXmlTagValue(block, 'ht:news_item_snippet');
    const newsItemUrl = getXmlTagValue(block, 'ht:news_item_url');

    items.push({
      externalId: normalizeExternalId('google-rss', title),
      externalUrl: newsItemUrl ?? buildGoogleTrendsExploreUrl(title, region),
      title,
      description: newsItemSnippet ?? newsItemTitle,
      thumbnailUrl,
      rank: index + 1,
      metrics: {
        traffic: traffic ?? 'Naik',
      },
      type: TRENDING_TYPES.SEARCH,
    });

    return items;
  }, []);
}

async function fetchGoogleTrendsRss(region: string): Promise<ScrapedItem[]> {
  const candidates = GOOGLE_TRENDS_RSS_SOURCES[region] ?? GOOGLE_TRENDS_RSS_SOURCES.ID ?? [];

  for (const candidate of candidates) {
    try {
      const response = await fetch(candidate.url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          Accept: 'application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8',
          'Accept-Language': candidate.locale ?? 'id-ID,id;q=0.9,en;q=0.8',
        },
      });

      if (!response.ok) {
        continue;
      }

      const xml = await response.text();
      const items = parseGoogleTrendsRss(xml, region);

      if (items.length > 0) {
        return items;
      }
    } catch {}
  }

  return [];
}

function dedupeItems(items: ScrapedItem[]): ScrapedItem[] {
  const itemMap = new Map<string, ScrapedItem>();

  for (const item of items) {
    itemMap.set(`${item.type}:${item.externalId}`, item);
  }

  return Array.from(itemMap.values());
}

export const youtubeScraper = {
  /**
   * Scrape trending data from YouTube and Google Trends
   */
  async scrape(region: string): Promise<ScraperResult> {
    try {
      const items: ScrapedItem[] = [];
      let hasSuccessfulSource = false;

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
            hasSuccessfulSource = data.items.length > 0;
          }
        } catch (apiErr: unknown) {
          const message = apiErr instanceof Error ? apiErr.message : 'Unknown error';
          console.error('Official YouTube API Failed:', message);
          // Continue to Google Trends sources for non-video signals
        }
      }

      let hasSearchSignals = false;

      try {
        // 2. Google Trends RSS searches (more stable than JSON endpoint)
        const rssItems = await fetchGoogleTrendsRss(region);
        if (rssItems.length > 0) {
          items.push(...rssItems);
          hasSuccessfulSource = true;
          hasSearchSignals = true;
        } else {
          throw new Error('Google Trends RSS returned no items');
        }
      } catch (rssError: unknown) {
        const message = rssError instanceof Error ? rssError.message : 'Unknown error';
        console.error('Google Trends RSS failed:', message);
      }

      if (!hasSearchSignals) {
        try {
          // 3. Legacy JSON daily trends fallback
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

          let rank = items.length + 1;
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

              if (rank > 80) {
                break;
              }
            }

            if (rank > 80) {
              break;
            }
          }

          hasSuccessfulSource = true;
          hasSearchSignals = true;
        } catch (dailyTrendsError: unknown) {
          const message =
            dailyTrendsError instanceof Error ? dailyTrendsError.message : 'Unknown error';
          console.error('Google Trends daily searches failed:', message);
        }
      }

      try {
        // 4. Related topics (best effort enrichment)
        const relatedRaw = await googleTrends.relatedTopics({
          keyword: 'YouTube',
          geo: region,
        });

        const related = JSON.parse(relatedRaw) as RelatedTopicsResult;

        let topicRank = items.length + 1;
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
        hasSuccessfulSource = true;
      } catch (relatedTopicsError: unknown) {
        const message =
          relatedTopicsError instanceof Error ? relatedTopicsError.message : 'Unknown error';
        console.error('Google Trends related topics failed:', message);
      }

      const uniqueItems = dedupeItems(items);

      if (uniqueItems.length > 0) {
        return {
          status: hasSuccessfulSource ? PLATFORM_STATUS.OK : PLATFORM_STATUS.DEGRADED,
          items: uniqueItems,
        };
      }

      throw new Error('All trending sources failed');
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
