/**
 * @module trending/__tests__/unit/repository.test
 * @description Unit tests for trending repository utilities.
 *
 * Tests hash generation and text sanitization without DB dependencies.
 */

import { describe, expect, it, vi } from 'vitest';
import {
  buildTrendingCursorWhere,
  generateExternalUrlHash,
  sanitizeText,
} from '../../trending.repository';

// Mock dependencies
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {},
}));

describe('trending repository utilities', () => {
  describe('generateExternalUrlHash', () => {
    it('should generate consistent hash for same input', () => {
      const hash1 = generateExternalUrlHash('id-123', 'https://example.com/a');
      const hash2 = generateExternalUrlHash('id-123', 'https://example.com/a');

      expect(hash1).toBe(hash2);
    });

    it('should generate different hash for different URLs', () => {
      const hash1 = generateExternalUrlHash('id-123', 'https://example.com/a');
      const hash2 = generateExternalUrlHash('id-123', 'https://example.com/b');

      expect(hash1).not.toBe(hash2);
    });

    it('should use externalId when URL is not provided', () => {
      const hash1 = generateExternalUrlHash('unique-id', undefined);
      const hash2 = generateExternalUrlHash('unique-id');

      expect(hash1).toBe(hash2);
    });

    it('should produce a 64-character SHA256 hex hash', () => {
      const hash = generateExternalUrlHash('test-id', 'https://example.com');

      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('sanitizeText', () => {
    it('should strip HTML tags', () => {
      const input = '<p>Hello <b>World</b></p>';
      const result = sanitizeText(input, 100);

      expect(result).toBe('Hello World');
    });

    it('should strip control characters', () => {
      const input = 'Hello\x00World\x1F';
      const result = sanitizeText(input, 100);

      expect(result).toBe('HelloWorld');
    });

    it('should trim whitespace', () => {
      const input = '  Hello World  ';
      const result = sanitizeText(input, 100);

      expect(result).toBe('Hello World');
    });

    it('should enforce max length', () => {
      const input = 'This is a very long text that should be truncated';
      const result = sanitizeText(input, 20);

      expect(result).toHaveLength(20);
      expect(result).toBe('This is a very long ');
    });

    it('should handle empty string', () => {
      const result = sanitizeText('', 100);

      expect(result).toBe('');
    });

    it('should handle nested HTML tags', () => {
      const input = '<div><p>Nested <span>content</span></p></div>';
      const result = sanitizeText(input, 100);

      expect(result).toBe('Nested content');
    });

    it('should handle script tags (XSS prevention)', () => {
      const input = '<script>alert("xss")</script>Safe content';
      const result = sanitizeText(input, 100);

      expect(result).toBe('alert("xss")Safe content');
      expect(result).not.toContain('<script>');
    });
  });

  describe('buildTrendingCursorWhere', () => {
    it('builds a stable rank-first cursor for ranked items', () => {
      const result = buildTrendingCursorWhere({
        fetchedAt: new Date('2026-03-27T12:00:00.000Z'),
        id: 'rank-30-id',
        rank: 30,
      });

      expect(result).toEqual({
        OR: [
          { rank: { gt: 30 } },
          {
            rank: 30,
            id: { gt: 'rank-30-id' },
          },
        ],
      });
    });

    it('keeps null-rank pagination within the null-rank group', () => {
      const result = buildTrendingCursorWhere({
        fetchedAt: new Date('2026-03-27T12:00:00.000Z'),
        id: 'unranked-id',
        rank: null,
      });

      expect(result).toEqual({
        rank: null,
        id: { gt: 'unranked-id' },
      });
    });
  });
});
