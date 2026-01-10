/**
 * FFmpeg Path Guard - Unit Tests
 * Tests for path validation, SSRF prevention, traversal blocking
 */

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import {
  mkdirSync,
  writeFileSync,
  rmdirSync,
  unlinkSync,
  symlinkSync,
} from "fs";
import { join } from "path";

// Test directories - set before module import
const TEST_BASE = join(process.cwd(), "test-temp-ffmpeg");
const TEST_UPLOADS = join(TEST_BASE, "uploads");
const TEST_TEMP = join(TEST_BASE, "temp");
const TEST_EXPORTS = join(TEST_BASE, "exports");
const TEST_FILE = join(TEST_UPLOADS, "test-video.mp4");
const TEST_SYMLINK = join(TEST_UPLOADS, "symlink-escape");

// Create directories BEFORE setting env vars
mkdirSync(TEST_UPLOADS, { recursive: true });
mkdirSync(TEST_TEMP, { recursive: true });
mkdirSync(TEST_EXPORTS, { recursive: true });

// Set env vars BEFORE module import
vi.stubEnv("MEDIA_INPUT_DIR", TEST_UPLOADS);
vi.stubEnv("MEDIA_TEMP_DIR", TEST_TEMP);
vi.stubEnv("MEDIA_OUTPUT_DIR", TEST_EXPORTS);

// Now import the module (after env vars are set)
const {
  validateInputPath,
  validateOutputPath,
  createJobTempDir,
  getAllowlistedDirs,
} = await import("../ffmpeg-path-guard");

describe("ffmpeg-path-guard", () => {
  beforeAll(() => {
    // Create test file
    writeFileSync(TEST_FILE, "test content");

    // Create symlink that escapes base (if not Windows)
    try {
      symlinkSync("/etc/passwd", TEST_SYMLINK);
    } catch {
      // Symlink creation may fail on some systems
    }
  });

  afterAll(() => {
    // Cleanup
    try {
      unlinkSync(TEST_FILE);
      unlinkSync(TEST_SYMLINK);
      rmdirSync(TEST_UPLOADS);
      rmdirSync(TEST_TEMP);
      rmdirSync(TEST_EXPORTS);
      rmdirSync(TEST_BASE);
    } catch {
      // Ignore cleanup errors
    }
  });

  describe("validateInputPath", () => {
    it("should accept valid file within uploads dir", () => {
      const result = validateInputPath(TEST_FILE);
      expect(result).toContain("test-video.mp4");
    });

    it("should reject path traversal attempts", () => {
      expect(() => validateInputPath("../../../etc/passwd")).toThrow(
        "Path traversal not allowed"
      );
    });

    it("should reject URL inputs (SSRF)", () => {
      expect(() => validateInputPath("http://evil.com/video.mp4")).toThrow(
        "URL inputs not allowed"
      );

      expect(() => validateInputPath("https://evil.com/video.mp4")).toThrow(
        "URL inputs not allowed"
      );

      expect(() => validateInputPath("file:///etc/passwd")).toThrow(
        "URL inputs not allowed"
      );

      expect(() => validateInputPath("ftp://server/file.mp4")).toThrow(
        "URL inputs not allowed"
      );
    });

    it("should reject null bytes (poison attack)", () => {
      expect(() => validateInputPath("video.mp4\x00.txt")).toThrow(
        "Null bytes not allowed"
      );
    });

    it("should reject non-existent files", () => {
      expect(() =>
        validateInputPath(join(TEST_UPLOADS, "nonexistent.mp4"))
      ).toThrow("Input file not found");
    });

    it("should reject paths outside allowed directories", () => {
      expect(() => validateInputPath("/etc/passwd")).toThrow(); // Either "not found" or "outside allowed"
    });
  });

  describe("validateOutputPath", () => {
    it("should accept valid output path within exports dir", () => {
      const outputPath = join(TEST_EXPORTS, "output.mp4");
      const result = validateOutputPath(outputPath);
      expect(result).toContain("output.mp4");
    });

    it("should accept valid output path within temp dir", () => {
      const outputPath = join(TEST_TEMP, "temp-output.mp4");
      const result = validateOutputPath(outputPath);
      expect(result).toContain("temp-output.mp4");
    });

    it("should reject path traversal in output", () => {
      expect(() => validateOutputPath("../../../tmp/malicious.mp4")).toThrow(
        "Path traversal not allowed"
      );
    });

    it("should reject URL outputs", () => {
      expect(() => validateOutputPath("http://evil.com/upload")).toThrow(
        "URL outputs not allowed"
      );
    });

    it("should reject null bytes in output path", () => {
      expect(() => validateOutputPath("output.mp4\x00.txt")).toThrow(
        "Null bytes not allowed"
      );
    });
  });

  describe("createJobTempDir", () => {
    it("should create isolated temp directory for job", () => {
      const jobId = "test-job-123";
      const tempDir = createJobTempDir(jobId);

      expect(tempDir).toContain("export-test-job-123");
    });
  });

  describe("getAllowlistedDirs", () => {
    it("should return configured directories", () => {
      const dirs = getAllowlistedDirs();

      expect(dirs).toHaveProperty("input");
      expect(dirs).toHaveProperty("temp");
      expect(dirs).toHaveProperty("output");
    });
  });
});
