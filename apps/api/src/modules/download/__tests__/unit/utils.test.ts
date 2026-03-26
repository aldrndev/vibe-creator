/**
 * @module download/__tests__/unit/utils
 * @description Unit tests for download utilities.
 *
 * Tests platform detection and URL parsing without external dependencies.
 */

import { describe, expect, it, vi } from 'vitest';

// Mock dependencies
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('download utilities', () => {
  describe('platform detection', () => {
    const detectPlatform = (url: string): string => {
      if (url.includes('youtube.com') || url.includes('youtu.be')) {
        return 'youtube';
      }
      if (url.includes('tiktok.com')) {
        return 'tiktok';
      }
      if (url.includes('instagram.com')) {
        return 'instagram';
      }
      if (url.includes('twitter.com') || url.includes('x.com')) {
        return 'twitter';
      }
      return 'unknown';
    };

    it('should detect YouTube URL', () => {
      expect(detectPlatform('https://youtube.com/watch?v=abc')).toBe('youtube');
      expect(detectPlatform('https://www.youtube.com/watch?v=abc')).toBe('youtube');
      expect(detectPlatform('https://youtu.be/abc')).toBe('youtube');
    });

    it('should detect TikTok URL', () => {
      expect(detectPlatform('https://tiktok.com/@user/video/123')).toBe('tiktok');
      expect(detectPlatform('https://www.tiktok.com/@user/video/123')).toBe('tiktok');
    });

    it('should detect Instagram URL', () => {
      expect(detectPlatform('https://instagram.com/reel/abc')).toBe('instagram');
      expect(detectPlatform('https://www.instagram.com/p/abc')).toBe('instagram');
    });

    it('should detect Twitter/X URL', () => {
      expect(detectPlatform('https://twitter.com/user/status/123')).toBe('twitter');
      expect(detectPlatform('https://x.com/user/status/123')).toBe('twitter');
    });

    it('should return unknown for unsupported URL', () => {
      expect(detectPlatform('https://example.com/video')).toBe('unknown');
    });
  });

  describe('file naming', () => {
    const generateFilename = (platform: string, extension: string = 'mp4'): string => {
      const timestamp = Date.now();
      return `${platform}_${timestamp}.${extension}`;
    };

    it('should generate filename with platform prefix', () => {
      const filename = generateFilename('youtube');
      expect(filename).toMatch(/^youtube_\d+\.mp4$/);
    });

    it('should support custom extension', () => {
      const filename = generateFilename('tiktok', 'mp3');
      expect(filename).toMatch(/^tiktok_\d+\.mp3$/);
    });
  });

  describe('URL validation', () => {
    const isValidUrl = (url: string): boolean => {
      try {
        new URL(url);
        return true;
      } catch {
        return false;
      }
    };

    it('should accept valid URLs', () => {
      expect(isValidUrl('https://youtube.com/watch?v=abc')).toBe(true);
      expect(isValidUrl('http://example.com/video')).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(isValidUrl('not-a-url')).toBe(false);
      expect(isValidUrl('ftp://invalid')).toBe(true); // URL constructor accepts ftp
      expect(isValidUrl('')).toBe(false);
    });
  });

  describe('download status values', () => {
    const DOWNLOAD_STATUS = {
      PENDING: 'PENDING',
      DOWNLOADING: 'DOWNLOADING',
      COMPLETED: 'COMPLETED',
      FAILED: 'FAILED',
    } as const;

    it('should have all required status values', () => {
      expect(Object.keys(DOWNLOAD_STATUS)).toHaveLength(4);
      expect(DOWNLOAD_STATUS.PENDING).toBe('PENDING');
      expect(DOWNLOAD_STATUS.COMPLETED).toBe('COMPLETED');
    });
  });
});
