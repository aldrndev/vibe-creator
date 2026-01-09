/**
 * @module auth/ratelimit
 * @description Rate limiting configurations for authentication endpoints.
 *
 * Protects against:
 * - Brute force attacks on login
 * - Account enumeration via registration
 * - Token refresh abuse
 *
 * All limits are IP-based with action-specific prefixes.
 *
 * Rate limiting can be disabled in test environments via DISABLE_RATE_LIMIT=true.
 * This should NEVER be enabled in production.
 */

import { ERROR_CODES } from "@vibe-creator/shared";
import { env } from "@/config/env";

/**
 * High limit for bypassing rate limit in test environment.
 * Setting max to 1000000 effectively disables rate limiting.
 */
const TEST_RATE_LIMIT = {
  max: 1000000,
  timeWindow: "1 minute",
};

/**
 * Check if rate limiting should be disabled (test environment only).
 */
const isRateLimitDisabled = (): boolean => {
  return env.DISABLE_RATE_LIMIT === true;
};

/**
 * Rate limit configuration for registration endpoint.
 * Limit: 3 attempts per hour per IP.
 */
export const registerRateLimit = {
  config: {
    rateLimit: {
      max: isRateLimitDisabled() ? TEST_RATE_LIMIT.max : 3,
      timeWindow: isRateLimitDisabled() ? TEST_RATE_LIMIT.timeWindow : "1 hour",
      keyGenerator: (request: { ip: string }) => `register:${request.ip}`,
      errorResponseBuilder: () => ({
        success: false,
        error: {
          code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
          message:
            "Terlalu banyak percobaan daftar. Silakan coba lagi dalam 1 jam.",
        },
      }),
    },
  },
};

/**
 * Rate limit configuration for login endpoint.
 * Limit: 5 attempts per 15 minutes per IP.
 */
export const loginRateLimit = {
  config: {
    rateLimit: {
      max: isRateLimitDisabled() ? TEST_RATE_LIMIT.max : 5,
      timeWindow: isRateLimitDisabled()
        ? TEST_RATE_LIMIT.timeWindow
        : "15 minutes",
      keyGenerator: (request: { ip: string }) => `login:${request.ip}`,
      errorResponseBuilder: () => ({
        success: false,
        error: {
          code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
          message:
            "Terlalu banyak percobaan masuk. Silakan coba lagi dalam 15 menit.",
        },
      }),
    },
  },
};

/**
 * Rate limit configuration for token refresh endpoint.
 * Limit: 10 attempts per minute per IP.
 */
export const refreshRateLimit = {
  config: {
    rateLimit: {
      max: isRateLimitDisabled() ? TEST_RATE_LIMIT.max : 10,
      timeWindow: isRateLimitDisabled()
        ? TEST_RATE_LIMIT.timeWindow
        : "1 minute",
      keyGenerator: (request: { ip: string }) => `refresh:${request.ip}`,
      errorResponseBuilder: () => ({
        success: false,
        error: {
          code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
          message:
            "Terlalu banyak permintaan refresh token. Mohon tunggu sebentar.",
        },
      }),
    },
  },
};
