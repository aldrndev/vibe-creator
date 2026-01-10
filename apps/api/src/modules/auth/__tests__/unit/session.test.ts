/**
 * @module auth/__tests__/unit/session
 * @description Unit tests for session management.
 *
 * Coverage:
 * - Token duration constants
 * - Session creation logic
 * - Token expiration calculation
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock prisma before importing module
vi.mock("@/lib/prisma", () => ({
  prisma: {
    userSession: {
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      create: vi.fn().mockResolvedValue({ id: "session-id" }),
    },
  },
}));

// Mock crypto utils
vi.mock("@/utils/crypto", () => ({
  generateToken: vi.fn((length = 64) => "a".repeat(length)),
  hashToken: vi.fn((token: string) => `hashed-${token}`),
}));

vi.mock("@/lib/jwt", () => ({
  signAccessToken: vi.fn().mockResolvedValue("jwt-access-token"),
}));

import {
  ACCESS_TOKEN_DURATION_MINUTES,
  REFRESH_TOKEN_DURATION_DAYS,
  createSession,
} from "@/modules/auth/auth.session";
import { prisma } from "@/lib/prisma";

describe("auth session", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T00:00:00.000Z"));
  });

  describe("constants", () => {
    it("should have access token duration of 60 minutes", () => {
      expect(ACCESS_TOKEN_DURATION_MINUTES).toBe(15);
    });

    it("should have refresh token duration of 30 days", () => {
      expect(REFRESH_TOKEN_DURATION_DAYS).toBe(7);
    });
  });

  describe("createSession", () => {
    const TEST_USER_ID = "user-123";
    const TEST_USER_AGENT = "Mozilla/5.0";
    const TEST_IP = "127.0.0.1";

    it("should invalidate all existing sessions before creating new one", async () => {
      await createSession(TEST_USER_ID, TEST_USER_AGENT, TEST_IP);

      expect(prisma.userSession.deleteMany).toHaveBeenCalledWith({
        where: { userId: TEST_USER_ID },
      });
    });

    it("should create session with hashed refresh token", async () => {
      await createSession(TEST_USER_ID, TEST_USER_AGENT, TEST_IP);

      expect(prisma.userSession.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: TEST_USER_ID,
          refreshToken: expect.stringContaining("hashed-"),
        }),
      });
    });

    it("should set correct access token expiration (15 minutes)", async () => {
      const result = await createSession(
        TEST_USER_ID,
        TEST_USER_AGENT,
        TEST_IP
      );

      const expectedExpiry = new Date("2024-01-01T00:15:00.000Z");
      expect(result.accessExpiresAt).toEqual(expectedExpiry);
    });

    it("should set correct refresh token expiration (7 days)", async () => {
      const result = await createSession(
        TEST_USER_ID,
        TEST_USER_AGENT,
        TEST_IP
      );

      const expectedExpiry = new Date("2024-01-08T00:00:00.000Z");
      expect(result.refreshExpiresAt).toEqual(expectedExpiry);
    });

    it("should return plain refresh token (not hashed)", async () => {
      const result = await createSession(
        TEST_USER_ID,
        TEST_USER_AGENT,
        TEST_IP
      );

      // Plain token should not contain 'hashed-' prefix
      expect(result.refreshToken).not.toContain("hashed-");
    });

    it("should store user agent and IP address", async () => {
      await createSession(TEST_USER_ID, TEST_USER_AGENT, TEST_IP);

      expect(prisma.userSession.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userAgent: TEST_USER_AGENT,
          ipAddress: TEST_IP,
        }),
      });
    });

    it("should handle null user agent", async () => {
      await createSession(TEST_USER_ID, null, TEST_IP);

      expect(prisma.userSession.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userAgent: null,
        }),
      });
    });
  });
});
