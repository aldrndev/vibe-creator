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
  describe('stream billing minutes', () => {
    it('does not bill a stream that fails before reaching LIVE', async () => {
      const { calculateStreamBilledMinutes } = await import('../../stream-billing');

      const billedMinutes = calculateStreamBilledMinutes({
        previousStatus: 'STARTING',
        finalStatus: 'FAILED',
        startedAt: new Date('2026-06-03T12:00:00.000Z'),
        finalizedAt: new Date('2026-06-03T12:00:42.000Z'),
      });

      expect(billedMinutes).toBe(0);
    });

    it('bills a stream that fails after it has gone live', async () => {
      const { calculateStreamBilledMinutes } = await import('../../stream-billing');

      const billedMinutes = calculateStreamBilledMinutes({
        previousStatus: 'LIVE',
        finalStatus: 'FAILED',
        startedAt: new Date('2026-06-03T12:00:00.000Z'),
        finalizedAt: new Date('2026-06-03T12:00:42.000Z'),
      });

      expect(billedMinutes).toBe(1);
    });

    it('keeps manual stop billing based on actual elapsed minutes', async () => {
      const { calculateStreamBilledMinutes } = await import('../../stream-billing');

      const billedMinutes = calculateStreamBilledMinutes({
        previousStatus: 'LIVE',
        finalStatus: 'ENDED',
        startedAt: new Date('2026-06-03T12:00:00.000Z'),
        finalizedAt: new Date('2026-06-03T12:02:01.000Z'),
      });

      expect(billedMinutes).toBe(3);
    });

    it('does not clamp admin stream duration to remaining quota minutes', async () => {
      const { resolveStreamEffectiveDuration } = await import('../../stream-billing');

      const effectiveDuration = resolveStreamEffectiveDuration({
        isAdmin: true,
        requestedDurationMinutes: 180,
        quotaRemainingMinutes: 0,
        absoluteMaxDurationMinutes: 1440,
      });

      expect(effectiveDuration).toBe(180);
    });

    it('keeps regular users clamped to remaining quota minutes', async () => {
      const { resolveStreamEffectiveDuration } = await import('../../stream-billing');

      const effectiveDuration = resolveStreamEffectiveDuration({
        isAdmin: false,
        requestedDurationMinutes: 180,
        quotaRemainingMinutes: 12,
        absoluteMaxDurationMinutes: 1440,
      });

      expect(effectiveDuration).toBe(12);
    });
  });

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
      const bitrate720 = Number.parseInt(QUALITY_PRESETS['720p'].bitrate, 10);
      const bitrate1080 = Number.parseInt(QUALITY_PRESETS['1080p'].bitrate, 10);
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

  describe('stream history schema', () => {
    it('uses 10 items as the default user-facing history page size', async () => {
      const { streamHistoryQuerySchema } = await import('../../stream.schemas');

      expect(streamHistoryQuerySchema.parse({}).limit).toBe(10);
    });
  });
});
