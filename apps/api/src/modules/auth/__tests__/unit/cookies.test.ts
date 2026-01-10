/**
 * @module auth/__tests__/unit/cookies
 * @description Unit tests for cookie management.
 *
 * Coverage:
 * - Cookie name constant
 * - Set cookie with correct attributes
 * - Clear cookie with matching attributes
 * - Production vs development secure flag
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { FastifyReply } from "fastify";
import {
  REFRESH_TOKEN_COOKIE,
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
} from "@/modules/auth/auth.cookies";

describe("auth cookies", () => {
  const mockReply = {
    setCookie: vi.fn(),
    clearCookie: vi.fn(),
  } as unknown as FastifyReply;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("REFRESH_TOKEN_COOKIE constant", () => {
    it("should be vibe_refresh_token", () => {
      expect(REFRESH_TOKEN_COOKIE).toBe("vibe_refresh_token");
    });
  });

  describe("setRefreshTokenCookie", () => {
    const testToken = "test-refresh-token";
    const testExpiry = new Date("2024-01-31T00:00:00.000Z");

    it("should set cookie with correct name and value", () => {
      setRefreshTokenCookie(mockReply, testToken, testExpiry);

      expect(mockReply.setCookie).toHaveBeenCalledWith(
        REFRESH_TOKEN_COOKIE,
        testToken,
        expect.any(Object)
      );
    });

    it("should set httpOnly to true", () => {
      setRefreshTokenCookie(mockReply, testToken, testExpiry);

      expect(mockReply.setCookie).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({ httpOnly: true })
      );
    });

    it("should set sameSite to lax", () => {
      setRefreshTokenCookie(mockReply, testToken, testExpiry);

      expect(mockReply.setCookie).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({ sameSite: "lax" })
      );
    });

    it("should set path to root", () => {
      setRefreshTokenCookie(mockReply, testToken, testExpiry);

      expect(mockReply.setCookie).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({ path: "/" })
      );
    });

    it("should set expires to provided date", () => {
      setRefreshTokenCookie(mockReply, testToken, testExpiry);

      expect(mockReply.setCookie).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({ expires: testExpiry })
      );
    });

    it("should set secure to false in test/development", () => {
      setRefreshTokenCookie(mockReply, testToken, testExpiry);

      expect(mockReply.setCookie).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({ secure: false })
      );
    });
  });

  describe("clearRefreshTokenCookie", () => {
    it("should clear cookie with correct name", () => {
      clearRefreshTokenCookie(mockReply);

      expect(mockReply.clearCookie).toHaveBeenCalledWith(
        REFRESH_TOKEN_COOKIE,
        expect.any(Object)
      );
    });

    it("should clear with same attributes as set (required by browsers)", () => {
      clearRefreshTokenCookie(mockReply);

      expect(mockReply.clearCookie).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          httpOnly: true,
          sameSite: "lax",
          path: "/",
        })
      );
    });
  });
});
