/**
 * @module director/__tests__/unit/policy
 * @description Unit tests for director policy (tenant isolation).
 *
 * Tests:
 * - Ownership verification (tenant isolation)
 * - Step-based access control
 * - Cross-user access denial
 */

import { describe, it, expect } from "vitest";
import { directorPolicy } from "@/modules/director/director.policy";
import type { DirectorSession } from "@prisma/client";

// Helper to create mock session
function createMockSession(
  overrides: Partial<DirectorSession> = {}
): DirectorSession {
  return {
    id: "session-123",
    userId: "user-123",
    step: "IMPORT",
    status: "READY",
    videoPath: null,
    analysisResult: null,
    selectedClips: null,
    exportPath: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as DirectorSession;
}

describe("directorPolicy", () => {
  describe("isOwner (Tenant Isolation)", () => {
    it("should return true when user owns the session", () => {
      const session = createMockSession({ userId: "user-123" });

      expect(directorPolicy.isOwner(session, "user-123")).toBe(true);
    });

    it("should return false for different user (cross-user denial)", () => {
      const session = createMockSession({ userId: "user-123" });

      expect(directorPolicy.isOwner(session, "user-456")).toBe(false);
    });

    it("should return false for empty userId", () => {
      const session = createMockSession({ userId: "user-123" });

      expect(directorPolicy.isOwner(session, "")).toBe(false);
    });

    it("should enforce strict equality", () => {
      const session = createMockSession({ userId: "user-123" });

      // Similar but not equal
      expect(directorPolicy.isOwner(session, "user-1234")).toBe(false);
      expect(directorPolicy.isOwner(session, "User-123")).toBe(false);
    });
  });

  describe("canImport", () => {
    it("should allow import for valid session", () => {
      const session = createMockSession({ step: "IMPORT" });

      expect(directorPolicy.canImport(session)).toBe(true);
    });

    it("should allow re-import", () => {
      const session = createMockSession({ step: "ANALYZING" });

      expect(directorPolicy.canImport(session)).toBe(true);
    });
  });

  describe("canAnalyze", () => {
    it("should allow analysis in IMPORT step", () => {
      const session = createMockSession({ step: "IMPORT" });

      expect(directorPolicy.canAnalyze(session)).toBe(true);
    });

    it("should allow analysis in ANALYZING step", () => {
      const session = createMockSession({ step: "ANALYZING" });

      expect(directorPolicy.canAnalyze(session)).toBe(true);
    });

    it("should deny analysis in EDITING step", () => {
      const session = createMockSession({ step: "EDITING" });

      expect(directorPolicy.canAnalyze(session)).toBe(false);
    });
  });

  describe("canExport", () => {
    it("should allow export in EDITING step", () => {
      const session = createMockSession({ step: "EDITING" });

      expect(directorPolicy.canExport(session)).toBe(true);
    });

    it("should allow export in EXPORTING step", () => {
      const session = createMockSession({ step: "EXPORTING" });

      expect(directorPolicy.canExport(session)).toBe(true);
    });

    it("should allow export in COMPLETED step", () => {
      const session = createMockSession({ step: "COMPLETED" });

      expect(directorPolicy.canExport(session)).toBe(true);
    });

    it("should deny export in IMPORT step", () => {
      const session = createMockSession({ step: "IMPORT" });

      expect(directorPolicy.canExport(session)).toBe(false);
    });

    it("should deny export in ANALYZING step", () => {
      const session = createMockSession({ step: "ANALYZING" });

      expect(directorPolicy.canExport(session)).toBe(false);
    });
  });

  describe("canSelectClips", () => {
    it("should allow clip selection for any session", () => {
      const session = createMockSession();

      expect(directorPolicy.canSelectClips(session)).toBe(true);
    });
  });
});
