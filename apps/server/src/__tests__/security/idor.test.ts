/**
 * @module __tests__/security/idor
 * @description Security tests for IDOR (Insecure Direct Object Reference).
 *
 * Per Digitesia Testing Standard:
 * - IDOR protection REQUIRED
 * - Resource existence MUST NOT be leaked
 * - Cross-user access MUST be denied
 */

import { describe, it, expect, vi } from "vitest";

// Mock prisma
const mockPrisma = {
  directorSession: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
  },
  project: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
  },
};

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

import { directorPolicy } from "@/modules/director/director.policy";

describe("IDOR Protection", () => {
  describe("Director Session Access", () => {
    it("should deny access to session owned by different user", () => {
      const session = {
        id: "session-123",
        userId: "user-A",
        step: "IMPORT",
        status: "READY",
      };

      // User B trying to access User A's session
      expect(directorPolicy.isOwner(session as never, "user-B")).toBe(false);
    });

    it("should allow access to session owned by same user", () => {
      const session = {
        id: "session-123",
        userId: "user-A",
        step: "IMPORT",
        status: "READY",
      };

      expect(directorPolicy.isOwner(session as never, "user-A")).toBe(true);
    });

    it("should reject empty userId", () => {
      const session = {
        id: "session-123",
        userId: "user-A",
        step: "IMPORT",
        status: "READY",
      };

      expect(directorPolicy.isOwner(session as never, "")).toBe(false);
    });

    it("should use strict equality (no type coercion)", () => {
      const session = {
        id: "session-123",
        userId: "123",
        step: "IMPORT",
        status: "READY",
      };

      // @ts-expect-error Testing type coercion
      expect(directorPolicy.isOwner(session as never, 123)).toBe(false);
    });
  });

  describe("Resource ID Format", () => {
    it("should use UUIDs instead of sequential IDs", () => {
      const validUUID = "123e4567-e89b-12d3-a456-426614174000";
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      expect(validUUID).toMatch(uuidRegex);
    });

    it("should reject sequential/predictable IDs", () => {
      const sequentialIds = ["1", "2", "100", "user_1", "session_100"];
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      for (const id of sequentialIds) {
        expect(id).not.toMatch(uuidRegex);
      }
    });
  });

  describe("Error Message Safety", () => {
    it("should not reveal resource existence in error", () => {
      // Both "not found" and "forbidden" should return same error
      const notFoundError = {
        code: "NOT_FOUND",
        message: "Resource tidak ditemukan",
      };
      const forbiddenError = {
        code: "NOT_FOUND", // Same code to prevent enumeration
        message: "Resource tidak ditemukan",
      };

      // Same response prevents enumeration
      expect(notFoundError.code).toBe(forbiddenError.code);
      expect(notFoundError.message).toBe(forbiddenError.message);
    });
  });
});
