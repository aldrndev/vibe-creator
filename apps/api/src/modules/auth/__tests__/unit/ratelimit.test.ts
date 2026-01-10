/**
 * @module auth/__tests__/unit/ratelimit
 * @description Unit tests for rate limiting configurations.
 *
 * Coverage:
 * - Rate limit constants for each endpoint
 * - Key generator functions
 * - Error response format
 */

import { describe, it, expect } from "vitest";
import { ERROR_CODES } from "@vibe-creator/shared";
import {
  registerRateLimit,
  loginRateLimit,
  refreshRateLimit,
} from "@/modules/auth/auth.ratelimit";

describe("auth rate limits", () => {
  describe("registerRateLimit", () => {
    it("should allow max 3 attempts", () => {
      expect(registerRateLimit.config.rateLimit.max).toBe(3);
    });

    it("should have 1 hour time window", () => {
      expect(registerRateLimit.config.rateLimit.timeWindow).toBe("1 hour");
    });

    it("should use IP-based key with register prefix", () => {
      const keyGen = registerRateLimit.config.rateLimit.keyGenerator;
      const key = keyGen({ ip: "192.168.1.1", url: "/api/v1/auth/register" });

      expect(key).toBe("register:ip:192.168.1.1:/api/v1/auth/register");
    });

    it("should return RATE_LIMIT_EXCEEDED error code", () => {
      const builder = registerRateLimit.config.rateLimit.errorResponseBuilder;
      const response = builder();

      expect(response.success).toBe(false);
      expect(response.error.code).toBe(ERROR_CODES.RATE_LIMIT_EXCEEDED);
    });
  });

  describe("loginRateLimit", () => {
    it("should allow max 5 attempts", () => {
      expect(loginRateLimit.config.rateLimit.max).toBe(5);
    });

    it("should have 15 minutes time window", () => {
      expect(loginRateLimit.config.rateLimit.timeWindow).toBe("15 minutes");
    });

    it("should use IP-based key with login prefix", () => {
      const keyGen = loginRateLimit.config.rateLimit.keyGenerator;
      const key = keyGen({ ip: "10.0.0.1", url: "/api/v1/auth/login" });

      expect(key).toBe("login:ip:10.0.0.1:/api/v1/auth/login");
    });

    it("should return RATE_LIMIT_EXCEEDED error code", () => {
      const builder = loginRateLimit.config.rateLimit.errorResponseBuilder;
      const response = builder();

      expect(response.success).toBe(false);
      expect(response.error.code).toBe(ERROR_CODES.RATE_LIMIT_EXCEEDED);
    });
  });

  describe("refreshRateLimit", () => {
    it("should allow max 10 attempts", () => {
      expect(refreshRateLimit.config.rateLimit.max).toBe(10);
    });

    it("should have 1 minute time window", () => {
      expect(refreshRateLimit.config.rateLimit.timeWindow).toBe("1 minute");
    });

    it("should use IP-based key with refresh prefix", () => {
      const keyGen = refreshRateLimit.config.rateLimit.keyGenerator;
      const key = keyGen({ ip: "172.16.0.1", url: "/api/v1/auth/refresh" });

      expect(key).toBe("refresh:ip:172.16.0.1:/api/v1/auth/refresh");
    });

    it("should return RATE_LIMIT_EXCEEDED error code", () => {
      const builder = refreshRateLimit.config.rateLimit.errorResponseBuilder;
      const response = builder();

      expect(response.success).toBe(false);
      expect(response.error.code).toBe(ERROR_CODES.RATE_LIMIT_EXCEEDED);
    });
  });

  describe("rate limit key isolation", () => {
    it("should prefer tenant/user key when available", () => {
      const keyGen = refreshRateLimit.config.rateLimit.keyGenerator;
      const key = keyGen({
        ip: "1.1.1.1",
        url: "/api/v1/auth/refresh",
        auth: { userId: "user-1", tenantId: "tenant-1" },
      });

      expect(key).toBe("refresh:tenant-1:user-1:/api/v1/auth/refresh");
    });

    it("should generate different keys for different IPs", () => {
      const keyGen = loginRateLimit.config.rateLimit.keyGenerator;

      const key1 = keyGen({ ip: "1.1.1.1", url: "/api/v1/auth/login" });
      const key2 = keyGen({ ip: "2.2.2.2", url: "/api/v1/auth/login" });

      expect(key1).not.toBe(key2);
    });

    it("should generate different keys for different actions", () => {
      const regKey = registerRateLimit.config.rateLimit.keyGenerator({
        ip: "1.1.1.1",
        url: "/api/v1/auth/register",
      });
      const loginKey = loginRateLimit.config.rateLimit.keyGenerator({
        ip: "1.1.1.1",
        url: "/api/v1/auth/login",
      });
      const refreshKey = refreshRateLimit.config.rateLimit.keyGenerator({
        ip: "1.1.1.1",
        url: "/api/v1/auth/refresh",
      });

      expect(regKey).not.toBe(loginKey);
      expect(loginKey).not.toBe(refreshKey);
      expect(regKey).not.toBe(refreshKey);
    });
  });
});
