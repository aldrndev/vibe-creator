/**
 * @module loop/__tests__/unit/utils
 * @description Unit tests for loop utility functions.
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

vi.mock("child_process", () => ({
  exec: vi.fn(),
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

vi.mock("@/modules/export/ffmpeg/ffmpeg-binary", () => ({
  getFFmpegPath: vi.fn().mockReturnValue({
    ffprobe: "/usr/bin/ffprobe",
    ffmpeg: "/usr/bin/ffmpeg",
  }),
}));

import {
  LOOPS_DIR,
  RESOLUTIONS,
  ensureLoopsDir,
  cleanupOldLoops,
} from "@/modules/loop/loop.utils";
import { existsSync } from "fs";
import { mkdir } from "fs/promises";

describe("loop.utils", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("LOOPS_DIR", () => {
    it("should be defined", () => {
      expect(LOOPS_DIR).toBeDefined();
      expect(LOOPS_DIR).toContain("loops");
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

    it("should have 4:5 Instagram portrait resolution", () => {
      expect(RESOLUTIONS["4:5"]).toEqual({ w: 1080, h: 1350 });
    });
  });

  describe("ensureLoopsDir", () => {
    it("should create directory if not exists", async () => {
      vi.mocked(existsSync).mockReturnValue(false);

      await ensureLoopsDir();

      expect(mkdir).toHaveBeenCalledWith(LOOPS_DIR, { recursive: true });
    });

    it("should not create directory if already exists", async () => {
      vi.mocked(existsSync).mockReturnValue(true);

      await ensureLoopsDir();

      expect(mkdir).not.toHaveBeenCalled();
    });
  });

  describe("cleanupOldLoops", () => {
    it("should not throw if directory is empty", async () => {
      vi.mocked(existsSync).mockReturnValue(true);

      await expect(cleanupOldLoops()).resolves.not.toThrow();
    });
  });
});
