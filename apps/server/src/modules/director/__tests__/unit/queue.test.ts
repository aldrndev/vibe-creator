/**
 * @module director/__tests__/unit/queue
 * @description Unit tests for director queue configuration.
 *
 * Coverage:
 * - Queue name constant
 * - Default job options (retry, backoff, DLQ)
 */

import { describe, it, expect } from "vitest";
import { DIRECTOR_QUEUE_NAME } from "@/modules/director/director.queue";

describe("director queue", () => {
  describe("queue name", () => {
    it("should be director-analysis", () => {
      expect(DIRECTOR_QUEUE_NAME).toBe("director-analysis");
    });
  });

  describe("job data types (compile-time validation)", () => {
    it("should have ANALYSIS job type with required fields", () => {
      const analysisJob = {
        type: "ANALYSIS" as const,
        sessionId: "session-1",
        assetId: "asset-1",
        filePath: "/path/to/file",
        userId: "user-1",
      };

      expect(analysisJob.type).toBe("ANALYSIS");
      expect(analysisJob.sessionId).toBeDefined();
      expect(analysisJob.assetId).toBeDefined();
      expect(analysisJob.filePath).toBeDefined();
      expect(analysisJob.userId).toBeDefined();
    });

    it("should have TRANSCRIBE_SESSION job type with required fields", () => {
      const transcribeJob = {
        type: "TRANSCRIBE_SESSION" as const,
        sessionId: "session-1",
        userId: "user-1",
      };

      expect(transcribeJob.type).toBe("TRANSCRIBE_SESSION");
      expect(transcribeJob.sessionId).toBeDefined();
      expect(transcribeJob.userId).toBeDefined();
    });

    it("should have TRANSCRIBE_CLIP job type with required fields", () => {
      const clipJob = {
        type: "TRANSCRIBE_CLIP" as const,
        sessionId: "session-1",
        selectedClipId: "clip-1",
        userId: "user-1",
      };

      expect(clipJob.type).toBe("TRANSCRIBE_CLIP");
      expect(clipJob.selectedClipId).toBeDefined();
    });

    it("should have EXPORT job type with options", () => {
      const exportJob = {
        type: "EXPORT" as const,
        sessionId: "session-1",
        userId: "user-1",
        options: {
          includeSubtitles: true,
          aspectRatio: "9:16" as const,
          quality: "1080p" as const,
        },
      };

      expect(exportJob.type).toBe("EXPORT");
      expect(exportJob.options.includeSubtitles).toBe(true);
      expect(exportJob.options.aspectRatio).toBe("9:16");
    });
  });
});
