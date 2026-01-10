/**
 * FFmpeg Command Builder - Unit Tests
 * Tests for safe command generation, clamping, validation
 */

import { describe, it, expect, afterAll, vi } from "vitest";
import { mkdirSync, writeFileSync, rmdirSync, unlinkSync } from "fs";
import { join } from "path";

// Test directories - set before module import
const TEST_BASE = join(process.cwd(), "test-temp-builder");
const TEST_UPLOADS = join(TEST_BASE, "uploads");
const TEST_TEMP = join(TEST_BASE, "temp");
const TEST_EXPORTS = join(TEST_BASE, "exports");
const TEST_VIDEO = join(TEST_UPLOADS, "test-video.mp4");
const TEST_AUDIO = join(TEST_UPLOADS, "test-audio.mp3");

// Create directories BEFORE setting env vars
mkdirSync(TEST_UPLOADS, { recursive: true });
mkdirSync(TEST_TEMP, { recursive: true });
mkdirSync(TEST_EXPORTS, { recursive: true });

// Set env vars BEFORE module import
vi.stubEnv("MEDIA_INPUT_DIR", TEST_UPLOADS);
vi.stubEnv("MEDIA_TEMP_DIR", TEST_TEMP);
vi.stubEnv("MEDIA_OUTPUT_DIR", TEST_EXPORTS);

// Create test files BEFORE module import (for path validation)
writeFileSync(TEST_VIDEO, "fake video content");
writeFileSync(TEST_AUDIO, "fake audio content");

// Now import the module (after env vars are set)
const {
  buildTrimCommand,
  buildEncodeCommand,
  buildMuxCommand,
  buildAudioMixCommand,
} = await import("../ffmpeg-command-builder");

describe("ffmpeg-command-builder", () => {
  afterAll(() => {
    try {
      unlinkSync(TEST_VIDEO);
      unlinkSync(TEST_AUDIO);
      rmdirSync(TEST_UPLOADS);
      rmdirSync(TEST_TEMP);
      rmdirSync(TEST_EXPORTS);
      rmdirSync(TEST_BASE);
    } catch {
      // Ignore cleanup errors
    }
  });

  describe("buildTrimCommand", () => {
    it("should generate valid trim args array", () => {
      const output = join(TEST_TEMP, "trimmed.mp4");
      const cmd = buildTrimCommand(TEST_VIDEO, output, 0, 5000, 10000);

      expect(cmd.args).toBeInstanceOf(Array);
      expect(cmd.args).toContain("-i");
      expect(cmd.args).toContain("-ss");
      expect(cmd.args).toContain("-t");
      expect(cmd.inputs).toContain(TEST_VIDEO);
      expect(cmd.expectedOutputs).toHaveLength(1);
    });

    it("should include standard safety flags", () => {
      const output = join(TEST_TEMP, "trimmed.mp4");
      const cmd = buildTrimCommand(TEST_VIDEO, output, 0, 5000, 10000);

      expect(cmd.args).toContain("-nostdin");
      expect(cmd.args).toContain("-hide_banner");
      expect(cmd.args.join(" ")).toContain("-progress");
    });

    it("should clamp negative start time to 0", () => {
      const output = join(TEST_TEMP, "trimmed.mp4");
      const cmd = buildTrimCommand(TEST_VIDEO, output, -1000, 5000, 10000);

      const ssIndex = cmd.args.indexOf("-ss");
      expect(parseFloat(cmd.args[ssIndex + 1] || "0")).toBeGreaterThanOrEqual(
        0
      );
    });
  });

  describe("buildEncodeCommand", () => {
    it("should generate valid encode args for 720p", () => {
      const output = join(TEST_EXPORTS, "encoded.mp4");
      const cmd = buildEncodeCommand(TEST_VIDEO, output, "balanced", "720p");

      expect(cmd.args).toContain("-c:v");
      expect(cmd.args).toContain("libx264");
      expect(cmd.args.join(" ")).toContain("1280:720");
    });

    it("should generate valid encode args for 1080p", () => {
      const output = join(TEST_EXPORTS, "encoded.mp4");
      const cmd = buildEncodeCommand(TEST_VIDEO, output, "quality", "1080p");

      expect(cmd.args.join(" ")).toContain("1920:1080");
      expect(cmd.args).toContain("slow"); // quality preset
    });

    it("should set correct preset based on export preset", () => {
      const output = join(TEST_EXPORTS, "encoded.mp4");

      const fastCmd = buildEncodeCommand(TEST_VIDEO, output, "fast", "720p");
      expect(fastCmd.args).toContain("veryfast");

      const balancedCmd = buildEncodeCommand(
        TEST_VIDEO,
        output,
        "balanced",
        "720p"
      );
      expect(balancedCmd.args).toContain("medium");
    });
  });

  describe("buildMuxCommand", () => {
    it("should generate valid mux args", () => {
      const output = join(TEST_EXPORTS, "muxed.mp4");
      const cmd = buildMuxCommand(TEST_VIDEO, TEST_AUDIO, output);

      expect(cmd.args).toContain("-map");
      expect(cmd.inputs).toContain(TEST_VIDEO);
      expect(cmd.inputs).toContain(TEST_AUDIO);
    });

    it("should use stream copy for fast muxing", () => {
      const output = join(TEST_EXPORTS, "muxed.mp4");
      const cmd = buildMuxCommand(TEST_VIDEO, TEST_AUDIO, output);

      expect(cmd.args).toContain("-c");
      expect(cmd.args).toContain("copy");
    });
  });

  describe("buildAudioMixCommand", () => {
    it("should generate valid audio mix args", () => {
      const output = join(TEST_TEMP, "mixed.aac");
      const cmd = buildAudioMixCommand(
        [
          { path: TEST_AUDIO, volume: 1.0 },
          { path: TEST_VIDEO, volume: 0.5 },
        ],
        output
      );

      expect(cmd.args).toContain("-filter_complex");
      expect(cmd.inputs).toHaveLength(2);
    });

    it("should clamp volume to safe range", () => {
      const output = join(TEST_TEMP, "mixed.aac");
      const cmd = buildAudioMixCommand(
        [{ path: TEST_AUDIO, volume: 5.0 }], // Over max
        output
      );

      // Volume should be clamped in filter
      const filterIndex = cmd.args.indexOf("-filter_complex");
      const filter = cmd.args[filterIndex + 1] || "";
      expect(filter).toContain("volume=2"); // Clamped to max 2
    });
  });

  describe("shell safety", () => {
    it("should never contain shell metacharacters in command", () => {
      const output = join(TEST_TEMP, "output.mp4");
      const cmd = buildTrimCommand(TEST_VIDEO, output, 0, 5000, 10000);

      const argsJoined = cmd.args.join(" ");

      // These would be dangerous in shell execution
      expect(argsJoined).not.toContain("`");
      expect(argsJoined).not.toContain("$(");
      expect(argsJoined).not.toContain("|");
      expect(argsJoined).not.toContain(";");
      expect(argsJoined).not.toContain("&&");
    });
  });
});
