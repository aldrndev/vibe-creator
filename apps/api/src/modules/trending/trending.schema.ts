/**
 * Trending Module Schemas
 * ============================================================================
 * Zod schemas for API validation
 */

import { z } from 'zod';

// ============================================================================
// ENUMS
// ============================================================================

export const TrendingTypeSchema = z.enum(['HASHTAG', 'TOPIC', 'SEARCH', 'VIDEO']);
export const PlatformStatusSchema = z.enum(['ok', 'degraded', 'down']);

// ============================================================================
// QUERY PARAMS
// ============================================================================

export const TrendingQuerySchema = z.object({
  type: TrendingTypeSchema.optional(),
  category: z.string().optional(),
  region: z.string().length(2).default('ID'),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
});

export type TrendingQuery = z.infer<typeof TrendingQuerySchema>;

// ============================================================================
// CURSOR
// ============================================================================

export const CursorSchema = z.object({
  fetchedAt: z.string().datetime(),
  id: z.string(),
});

export type Cursor = z.infer<typeof CursorSchema>;

// ============================================================================
// RESPONSE ITEMS
// ============================================================================

export const TrendingItemSchema = z.object({
  id: z.string(),
  platform: z.string(),
  type: TrendingTypeSchema,
  title: z.string(),
  description: z.string().nullable(),
  thumbnailUrl: z.string().nullable(),
  externalUrl: z.string().nullable(),
  rank: z.number().nullable(),
  metrics: z.record(z.string(), z.unknown()),
  category: z.string().nullable(),
  region: z.string(),
  fetchedAt: z.string().datetime(),
});

export type TrendingItem = z.infer<typeof TrendingItemSchema>;

export const TrendingStatusSchema = z.object({
  platform: z.string(),
  region: z.string(),
  status: PlatformStatusSchema,
  lastSuccessAt: z.string().datetime().nullable(),
});

export type TrendingStatus = z.infer<typeof TrendingStatusSchema>;

// ============================================================================
// API RESPONSES
// ============================================================================

export const TrendingListResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    items: z.array(TrendingItemSchema),
    nextCursor: z.string().nullable(),
    status: TrendingStatusSchema,
  }),
});

export type TrendingListResponse = z.infer<typeof TrendingListResponseSchema>;

export const RefreshResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    jobId: z.string(),
    message: z.string(),
  }),
});

export type RefreshResponse = z.infer<typeof RefreshResponseSchema>;

// ============================================================================
// SCRAPER RESULT
// ============================================================================

export const ScrapedItemSchema = z.object({
  externalId: z.string(),
  externalUrl: z.string().optional(),
  title: z.string().max(200),
  description: z.string().max(500).optional(),
  thumbnailUrl: z.string().optional(),
  rank: z.number().optional(),
  metrics: z.record(z.string(), z.unknown()).optional(),
  category: z.string().optional(),
  type: TrendingTypeSchema,
});

export type ScrapedItem = z.infer<typeof ScrapedItemSchema>;

export const ScraperResultSchema = z.object({
  status: PlatformStatusSchema,
  items: z.array(ScrapedItemSchema),
  error: z.string().optional(),
});

export type ScraperResult = z.infer<typeof ScraperResultSchema>;
