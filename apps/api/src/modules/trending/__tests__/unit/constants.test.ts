/**
 * @module trending/__tests__/unit/constants.test
 * @description Unit tests for trending constants.
 *
 * Verifies configuration values are within expected bounds.
 */

import { describe, expect, it } from 'vitest';
import {
  ALLOWED_DOMAINS,
  BLOCKED_IP_RANGES,
  CACHE_CONFIG,
  DATA_EXPIRY_HOURS,
  PAGINATION,
  PLATFORM_STATUS,
  REFRESH_COOLDOWN_SECONDS,
  RETENTION_CONFIG,
  STATUS_WINDOW,
  TRENDING_REFRESH_INTERVAL_MS,
  TRENDING_STARTUP_REFRESH_DELAY_MS,
  TRENDING_STARTUP_REFRESH_SPACING_MS,
  TRENDING_TYPES,
} from '../../trending.constants';

describe('trending constants', () => {
  describe('ALLOWED_DOMAINS', () => {
    it('should include YouTube API and media domains', () => {
      expect(ALLOWED_DOMAINS).toContain('www.googleapis.com');
      expect(ALLOWED_DOMAINS).toContain('www.youtube.com');
      expect(ALLOWED_DOMAINS).toContain('i.ytimg.com');
    });

    it('should be a non-empty array', () => {
      expect(ALLOWED_DOMAINS.length).toBeGreaterThan(0);
    });
  });

  describe('BLOCKED_IP_RANGES', () => {
    it('should block private IPv4 ranges', () => {
      expect(BLOCKED_IP_RANGES).toContain('10.0.0.0/8');
      expect(BLOCKED_IP_RANGES).toContain('172.16.0.0/12');
      expect(BLOCKED_IP_RANGES).toContain('192.168.0.0/16');
    });

    it('should block localhost', () => {
      expect(BLOCKED_IP_RANGES).toContain('127.0.0.0/8');
    });

    it('should block metadata endpoint', () => {
      expect(BLOCKED_IP_RANGES).toContain('169.254.0.0/16');
    });
  });

  describe('TRENDING_TYPES', () => {
    it('should have all required types', () => {
      expect(TRENDING_TYPES.HASHTAG).toBe('HASHTAG');
      expect(TRENDING_TYPES.TOPIC).toBe('TOPIC');
      expect(TRENDING_TYPES.SEARCH).toBe('SEARCH');
      expect(TRENDING_TYPES.VIDEO).toBe('VIDEO');
    });
  });

  describe('PLATFORM_STATUS', () => {
    it('should have all required statuses', () => {
      expect(PLATFORM_STATUS.OK).toBe('ok');
      expect(PLATFORM_STATUS.DEGRADED).toBe('degraded');
      expect(PLATFORM_STATUS.DOWN).toBe('down');
    });
  });

  describe('CACHE_CONFIG', () => {
    it('should have positive TTL', () => {
      expect(CACHE_CONFIG.FIRST_PAGE_TTL_SECONDS).toBeGreaterThan(0);
    });

    it('should have a key prefix', () => {
      expect(CACHE_CONFIG.KEY_PREFIX).toBeTruthy();
      expect(typeof CACHE_CONFIG.KEY_PREFIX).toBe('string');
    });
  });

  describe('REFRESH_COOLDOWN_SECONDS', () => {
    it('should use a short admin-only cooldown to avoid duplicate refresh jobs', () => {
      expect(REFRESH_COOLDOWN_SECONDS).toBe(15 * 60);
    });
  });

  describe('TRENDING_REFRESH_INTERVAL_MS', () => {
    it('should refresh cached regions every six hours', () => {
      expect(TRENDING_REFRESH_INTERVAL_MS).toBe(6 * 60 * 60 * 1000);
    });

    it('should stagger startup jobs after initial boot delay', () => {
      expect(TRENDING_STARTUP_REFRESH_DELAY_MS).toBeGreaterThan(0);
      expect(TRENDING_STARTUP_REFRESH_SPACING_MS).toBeGreaterThan(0);
    });
  });

  describe('DATA_EXPIRY_HOURS', () => {
    it('should be at least 24 hours', () => {
      expect(DATA_EXPIRY_HOURS).toBeGreaterThanOrEqual(24);
    });
  });

  describe('RETENTION_CONFIG', () => {
    it('should have cleanup hours greater than expiry', () => {
      expect(RETENTION_CONFIG.CLEANUP_AFTER_HOURS).toBeGreaterThanOrEqual(DATA_EXPIRY_HOURS);
    });
  });

  describe('PAGINATION', () => {
    it('should have default limit between 10 and 50', () => {
      expect(PAGINATION.DEFAULT_LIMIT).toBeGreaterThanOrEqual(10);
      expect(PAGINATION.DEFAULT_LIMIT).toBeLessThanOrEqual(50);
    });

    it('should cap list responses to YouTube Top 50', () => {
      expect(PAGINATION.MAX_LIMIT).toBe(50);
    });
  });

  describe('STATUS_WINDOW', () => {
    it('should have OK hours less than degraded hours', () => {
      expect(STATUS_WINDOW.OK_HOURS).toBeLessThan(STATUS_WINDOW.DEGRADED_HOURS);
    });
  });
});
