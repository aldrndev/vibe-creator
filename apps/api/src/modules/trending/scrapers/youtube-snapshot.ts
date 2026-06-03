/**
 * Degraded-mode trending snapshot used when every live source is unavailable.
 */

import { TRENDING_TYPES } from '../trending.constants';
import type { ScrapedItem } from '../trending.schema';

export const YOUTUBE_DEGRADED_SNAPSHOT_ITEMS: readonly ScrapedItem[] = [
  {
    externalId: 'snapshot-timnas-2026',
    title: 'Highlights: Timnas Indonesia vs Korea Selatan',
    description: 'Kualifikasi Piala Dunia 2026 - Pertandingan Dramatis!',
    rank: 1,
    metrics: { traffic: '5M+' },
    type: TRENDING_TYPES.VIDEO,
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
    type: TRENDING_TYPES.VIDEO,
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
    type: TRENDING_TYPES.VIDEO,
    category: 'Gaming',
    externalUrl: 'https://www.youtube.com/results?search_query=rrq+vs+onic+mpl+s16',
  },
  {
    externalId: 'snapshot-jkt48-new',
    title: 'JKT48 - Original Single Launch',
    description: 'Live Performance at Gelora Bung Karno',
    rank: 4,
    metrics: { traffic: '1.2M+' },
    type: TRENDING_TYPES.VIDEO,
    category: 'Music',
    externalUrl: 'https://www.youtube.com/results?search_query=jkt48+new+single',
  },
  {
    externalId: 'snapshot-food-viral',
    title: 'Resep Rendang Viral TikTok',
    description: 'Cara masak rendang empuk dalam 30 menit',
    rank: 5,
    metrics: { traffic: '900K+' },
    type: TRENDING_TYPES.VIDEO,
    category: 'Howto & Style',
    externalUrl: 'https://www.youtube.com/results?search_query=resep+rendang+viral',
  },
  {
    externalId: 'snapshot-deddy-podcast',
    title: 'Deddy Corbuzier - Tamu Internasional',
    description: 'Podcast eksklusif yang mengguncang internet',
    rank: 6,
    metrics: { traffic: '3M+' },
    type: TRENDING_TYPES.VIDEO,
    category: 'Entertainment',
    externalUrl: 'https://www.youtube.com/results?search_query=deddy+corbuzier+podcast',
  },
  {
    externalId: 'snapshot-game-windah',
    title: 'WINDAH BASUDARA - TAMAT',
    description: 'Live Streaming ending game horor terbaru',
    rank: 7,
    metrics: { traffic: '1.5M+' },
    type: TRENDING_TYPES.VIDEO,
    category: 'Gaming',
    externalUrl: 'https://www.youtube.com/results?search_query=windah+basudara',
  },
];
