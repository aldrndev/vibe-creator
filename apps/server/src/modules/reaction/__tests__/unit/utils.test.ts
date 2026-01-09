/**
 * @module reaction/__tests__/unit/utils
 * @description Unit tests for reaction utility functions.
 *
 * Tests pure utility logic without FFmpeg dependencies.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock fs before imports
vi.mock("fs", () => ({
  existsSync: vi.fn(),
}));

vi.mock("fs/promises", () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  readdir: vi.fn().mockResolvedValue([]),
  stat: vi.fn().mockResolvedValue({ mtimeMs: Date.now() }),
  unlink: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("@/config/env", () => ({
  env: {
    MEDIA_INPUT_DIR: "/tmp/test-uploads",
  },
}));

import {
  REACTIONS_DIR,
  RESOLUTIONS,
  ensureReactionsDir,
  getOverlayPosition,
  cleanupOldReactions,
} from "@/modules/reaction/reaction.utils";
import { existsSync } from "fs";
import { mkdir } from "fs/promises";

describe("reaction.utils", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("REACTIONS_DIR", () => {
    it("should be defined", () => {
      expect(REACTIONS_DIR).toBeDefined();
      expect(REACTIONS_DIR).toContain("reactions");
    });
  });

  describe("RESOLUTIONS", () => {
    it("should have 16:9 landscape resolution", () => {
      expect(RESOLUTIONS["16:9"]).toEqual({ w: 1920, h: 1080 });
    });

    it("should have 9:16 portrait resolution", () => {
      expect(RESOLUTIONS["9:16"]).toEqual({ w: 1080, h: 1920 });
    });

    it("should have 1:1 square resolution", () => {
      expect(RESOLUTIONS["1:1"]).toEqual({ w: 1080, h: 1080 });
    });
  });

  describe("getOverlayPosition", () => {
    const margin = 20;

    it("should return FFmpeg filter string for bottom-right", () => {
      const result = getOverlayPosition("bottom-right", margin);
      expect(result).toBe(
        `main_w-overlay_w-${margin}:main_h-overlay_h-${margin}`
      );
    });

    it("should return FFmpeg filter string for top-left", () => {
      const result = getOverlayPosition("top-left", margin);
      expect(result).toBe(`${margin}:${margin}`);
    });

    it("should return FFmpeg filter string for top-right", () => {
      const result = getOverlayPosition("top-right", margin);
      expect(result).toBe(`main_w-overlay_w-${margin}:${margin}`);
    });

    it("should return FFmpeg filter string for bottom-left", () => {
      const result = getOverlayPosition("bottom-left", margin);
      expect(result).toBe(`${margin}:main_h-overlay_h-${margin}`);
    });

    it("should use custom coordinates when provided", () => {
      const result = getOverlayPosition("top-left", 0, { x: 100, y: 50 });
      expect(result).toBe("100:50");
    });
  });

  describe("ensureReactionsDir", () => {
    it("should create directory if not exists", async () => {
      vi.mocked(existsSync).mockReturnValue(false);

      await ensureReactionsDir();

      expect(mkdir).toHaveBeenCalledWith(REACTIONS_DIR, { recursive: true });
    });

    it("should not create directory if already exists", async () => {
      vi.mocked(existsSync).mockReturnValue(true);

      await ensureReactionsDir();

      expect(mkdir).not.toHaveBeenCalled();
    });
  });

  describe("cleanupOldReactions", () => {
    it("should not throw if directory is empty", async () => {
      vi.mocked(existsSync).mockReturnValue(true);

      await expect(cleanupOldReactions(3600000)).resolves.not.toThrow();
    });
  });
});
