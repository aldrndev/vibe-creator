/**
 * @module trending/__tests__/contract/schema.test
 * @description Contract tests for trending API schemas.
 *
 * Validates Zod schemas match expected API contract.
 */

import { describe, expect, it } from 'vitest';
import {
  PlatformStatusSchema,
  ScrapedItemSchema,
  TrendingItemSchema,
  TrendingListResponseSchema,
  TrendingQuerySchema,
  TrendingRegionCodeSchema,
  TrendingStatusSchema,
  TrendingTypeSchema,
} from '../../trending.schema';

describe('trending schema contracts', () => {
  describe('TrendingTypeSchema', () => {
    it('should accept valid types', () => {
      expect(TrendingTypeSchema.parse('HASHTAG')).toBe('HASHTAG');
      expect(TrendingTypeSchema.parse('TOPIC')).toBe('TOPIC');
      expect(TrendingTypeSchema.parse('SEARCH')).toBe('SEARCH');
      expect(TrendingTypeSchema.parse('VIDEO')).toBe('VIDEO');
    });

    it('should reject invalid types', () => {
      expect(() => TrendingTypeSchema.parse('INVALID')).toThrow();
      expect(() => TrendingTypeSchema.parse('')).toThrow();
    });
  });

  describe('PlatformStatusSchema', () => {
    it('should accept valid statuses', () => {
      expect(PlatformStatusSchema.parse('ok')).toBe('ok');
      expect(PlatformStatusSchema.parse('degraded')).toBe('degraded');
      expect(PlatformStatusSchema.parse('down')).toBe('down');
    });

    it('should reject invalid statuses', () => {
      expect(() => PlatformStatusSchema.parse('unknown')).toThrow();
    });
  });

  describe('TrendingQuerySchema', () => {
    it('should apply defaults', () => {
      const result = TrendingQuerySchema.parse({});

      expect(result.region).toBe('ID');
      expect(result.limit).toBe(20);
      expect(result.type).toBeUndefined();
      expect(result.cursor).toBeUndefined();
    });

    it('should accept valid query params', () => {
      const result = TrendingQuerySchema.parse({
        type: 'HASHTAG',
        region: 'US',
        limit: '50',
        cursor: 'abc123',
      });

      expect(result.type).toBe('HASHTAG');
      expect(result.region).toBe('US');
      expect(result.limit).toBe(50);
      expect(result.cursor).toBe('abc123');
    });

    it('should enforce supported regions', () => {
      expect(TrendingRegionCodeSchema.parse('ID')).toBe('ID');
      expect(TrendingRegionCodeSchema.parse('GB')).toBe('GB');
      expect(() => TrendingQuerySchema.parse({ region: 'USA' })).toThrow();
      expect(() => TrendingQuerySchema.parse({ region: 'U' })).toThrow();
      expect(() => TrendingQuerySchema.parse({ region: 'BR' })).toThrow();
    });

    it('should enforce limit bounds', () => {
      expect(() => TrendingQuerySchema.parse({ limit: '0' })).toThrow();
      expect(() => TrendingQuerySchema.parse({ limit: '51' })).toThrow();
    });
  });

  describe('TrendingListResponseSchema', () => {
    it('should expose response metadata for Top 50 availability', () => {
      const response = {
        success: true,
        data: {
          items: [],
          nextCursor: null,
          status: {
            platform: 'YOUTUBE',
            region: 'ID',
            status: 'ok',
            lastSuccessAt: '2024-01-01T00:00:00.000Z',
          },
          metadata: {
            maxResults: 50,
            returnedCount: 49,
            regionLabel: 'Indonesia',
            lastUpdatedAt: '2024-01-01T00:00:00.000Z',
          },
        },
      };

      const result = TrendingListResponseSchema.parse(response);

      expect(result.data.metadata.returnedCount).toBe(49);
      expect(result.data.metadata.maxResults).toBe(50);
    });
  });

  describe('TrendingItemSchema', () => {
    it('should validate a complete item', () => {
      const validItem = {
        id: 'cuid-123',
        platform: 'YOUTUBE',
        type: 'SEARCH',
        title: 'Test trending',
        description: 'A description',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        externalUrl: 'https://trends.google.com/explore',
        rank: 1,
        metrics: { traffic: '1M+' },
        category: 'Entertainment',
        region: 'ID',
        fetchedAt: '2024-01-01T00:00:00.000Z',
      };

      const result = TrendingItemSchema.parse(validItem);

      expect(result.id).toBe('cuid-123');
      expect(result.title).toBe('Test trending');
    });

    it('should allow nullable fields', () => {
      const minimalItem = {
        id: 'cuid-123',
        platform: 'YOUTUBE',
        type: 'TOPIC',
        title: 'Test',
        description: null,
        thumbnailUrl: null,
        externalUrl: null,
        rank: null,
        metrics: {},
        category: null,
        region: 'ID',
        fetchedAt: '2024-01-01T00:00:00.000Z',
      };

      expect(() => TrendingItemSchema.parse(minimalItem)).not.toThrow();
    });
  });

  describe('TrendingStatusSchema', () => {
    it('should validate status response', () => {
      const status = {
        platform: 'YOUTUBE',
        region: 'ID',
        status: 'ok',
        lastSuccessAt: '2024-01-01T00:00:00.000Z',
      };

      const result = TrendingStatusSchema.parse(status);

      expect(result.status).toBe('ok');
    });

    it('should allow null lastSuccessAt', () => {
      const status = {
        platform: 'YOUTUBE',
        region: 'ID',
        status: 'down',
        lastSuccessAt: null,
      };

      expect(() => TrendingStatusSchema.parse(status)).not.toThrow();
    });
  });

  describe('ScrapedItemSchema', () => {
    it('should validate scraped item', () => {
      const item = {
        externalId: 'google-trend-abc',
        externalUrl: 'https://trends.google.com/explore',
        title: 'Trending topic',
        description: 'Description here',
        thumbnailUrl: 'https://example.com/img.jpg',
        rank: 1,
        metrics: { traffic: '500K+' },
        category: 'News',
        type: 'SEARCH',
      };

      expect(() => ScrapedItemSchema.parse(item)).not.toThrow();
    });

    it('should enforce title max length', () => {
      const item = {
        externalId: 'id',
        title: 'a'.repeat(201),
        type: 'TOPIC',
      };

      expect(() => ScrapedItemSchema.parse(item)).toThrow();
    });

    it('should enforce description max length', () => {
      const item = {
        externalId: 'id',
        title: 'Valid title',
        description: 'a'.repeat(501),
        type: 'TOPIC',
      };

      expect(() => ScrapedItemSchema.parse(item)).toThrow();
    });
  });
});
