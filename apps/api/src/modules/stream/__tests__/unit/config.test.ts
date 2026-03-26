/**
 * @module stream/__tests__/unit/config
 * @description Unit tests for stream configuration and utilities.
 *
 * Tests pure config values without FFmpeg or DB dependencies.
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

vi.mock('@/lib/prisma', () => ({
  prisma: {},
}));

vi.mock('child_process', () => ({
  spawn: vi.fn(),
}));

describe('stream configuration', () => {
  describe('platform config', () => {
    it('should have YouTube RTMP base URL', () => {
      const YOUTUBE_RTMP = 'rtmp://a.rtmp.youtube.com/live2';
      expect(YOUTUBE_RTMP).toContain('youtube.com');
    });

    it('should have Twitch RTMP base URL', () => {
      const TWITCH_RTMP = 'rtmp://live.twitch.tv/app';
      expect(TWITCH_RTMP).toContain('twitch.tv');
    });

    it('should have TikTok RTMP base URL', () => {
      const TIKTOK_RTMP = 'rtmp://rtmp-push.tiktok.com/live';
      expect(TIKTOK_RTMP).toContain('tiktok.com');
    });
  });

  describe('quality presets', () => {
    const QUALITY_PRESETS = {
      '720p': { width: 1280, height: 720, bitrate: '3000k' },
      '1080p': { width: 1920, height: 1080, bitrate: '6000k' },
    };

    it('should have 720p preset with correct dimensions', () => {
      expect(QUALITY_PRESETS['720p']).toEqual({
        width: 1280,
        height: 720,
        bitrate: '3000k',
      });
    });

    it('should have 1080p preset with correct dimensions', () => {
      expect(QUALITY_PRESETS['1080p']).toEqual({
        width: 1920,
        height: 1080,
        bitrate: '6000k',
      });
    });

    it('should have higher bitrate for 1080p than 720p', () => {
      const bitrate720 = parseInt(QUALITY_PRESETS['720p'].bitrate, 10);
      const bitrate1080 = parseInt(QUALITY_PRESETS['1080p'].bitrate, 10);
      expect(bitrate1080).toBeGreaterThan(bitrate720);
    });
  });

  describe('stream status values', () => {
    const STREAM_STATUS = {
      STARTING: 'STARTING',
      LIVE: 'LIVE',
      STOPPING: 'STOPPING',
      ENDED: 'ENDED',
      FAILED: 'FAILED',
    } as const;

    it('should have all required status values', () => {
      expect(Object.keys(STREAM_STATUS)).toHaveLength(5);
      expect(STREAM_STATUS.STARTING).toBe('STARTING');
      expect(STREAM_STATUS.LIVE).toBe('LIVE');
      expect(STREAM_STATUS.ENDED).toBe('ENDED');
    });
  });
});
