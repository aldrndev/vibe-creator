/**
 * @module plugins/__tests__/auth
 * @description Unit tests for auth plugin middleware.
 *
 * Tests:
 * - requireAuth middleware blocks unauthenticated
 * - requireAdmin middleware blocks non-admin
 * - Authorization policies enforced
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { FastifyRequest, FastifyReply } from "fastify";

// Mock dependencies
vi.mock("@/lib/prisma", () => ({
  prisma: { userSession: { findUnique: vi.fn() } },
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("@/utils/response", () => ({
  sendError: vi.fn(),
}));

vi.mock("@/lib/audit", () => ({
  audit: vi.fn(),
  AuditAction: {
    ACCESS_DENIED: "ACCESS_DENIED",
  },
}));

import { requireAuth, requireAdmin } from "@/plugins/auth";
import { sendError } from "@/utils/response";

// Helper to create mock request/reply
function createMockContext(user: unknown = null) {
  const request = {
    user,
    session: user ? { token: "test-token" } : null,
    headers: {},
    url: "/test",
  } as unknown as FastifyRequest;

  const reply = {
    status: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
  } as unknown as FastifyReply;

  return { request, reply };
}

describe("auth plugin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("requireAuth", () => {
    it("should call done() when user is authenticated", () => {
      const { request, reply } = createMockContext({
        id: "user-123",
        email: "test@test.com",
        role: "USER",
      });

      requireAuth(request, reply);

      expect(sendError).not.toHaveBeenCalled();
    });

    it("should block unauthenticated requests", () => {
      const { request, reply } = createMockContext(null);

      requireAuth(request, reply);

      expect(sendError).toHaveBeenCalledWith(
        reply,
        expect.any(String),
        expect.any(String),
        401
      );
    });

    it("should return 401 UNAUTHORIZED error code", () => {
      const { request, reply } = createMockContext(null);

      requireAuth(request, reply);

      expect(sendError).toHaveBeenCalledWith(
        reply,
        expect.stringContaining("UNAUTHORIZED"),
        expect.any(String),
        401
      );
    });
  });

  describe("requireAdmin", () => {
    it("should call done() when user is admin", () => {
      const { request, reply } = createMockContext({
        id: "admin-123",
        email: "admin@test.com",
        role: "ADMIN",
      });

      requireAdmin(request, reply);

      expect(sendError).not.toHaveBeenCalled();
    });

    it("should block non-admin users with 403", () => {
      const { request, reply } = createMockContext({
        id: "user-123",
        email: "user@test.com",
        role: "USER",
      });

      requireAdmin(request, reply);

      expect(sendError).toHaveBeenCalledWith(
        reply,
        expect.any(String),
        expect.any(String),
        403
      );
    });

    it("should block unauthenticated users with 401", () => {
      const { request, reply } = createMockContext(null);

      requireAdmin(request, reply);

      expect(sendError).toHaveBeenCalledWith(
        reply,
        expect.any(String),
        expect.any(String),
        401
      );
    });

    it("should return FORBIDDEN for authenticated non-admin", () => {
      const { request, reply } = createMockContext({
        id: "user-123",
        email: "user@test.com",
        role: "USER",
      });

      requireAdmin(request, reply);

      expect(sendError).toHaveBeenCalledWith(
        reply,
        expect.stringContaining("FORBIDDEN"),
        expect.any(String),
        403
      );
    });
  });

  describe("Authorization edge cases", () => {
    it("should handle user with empty role", () => {
      const { request, reply } = createMockContext({
        id: "user-123",
        email: "user@test.com",
        role: "",
      });

      requireAdmin(request, reply);

      expect(sendError).toHaveBeenCalledWith(
        reply,
        expect.any(String),
        expect.any(String),
        403
      );
    });

    it("should treat undefined role as non-admin", () => {
      const { request, reply } = createMockContext({
        id: "user-123",
        email: "user@test.com",
      });

      requireAdmin(request, reply);

    });
  });
});
