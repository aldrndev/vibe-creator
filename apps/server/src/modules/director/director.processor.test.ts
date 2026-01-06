import { describe, it, expect } from "vitest";
import { directorProcessor, Segment } from "./director.processor";

describe("Director Processor: Post-Processing", () => {
  it("should merge segments closer than mergeGap", () => {
    const input: Segment[] = [
      { start: 0, end: 5, duration: 5, score: 0.8 },
      { start: 5.2, end: 10, duration: 4.8, score: 0.8 }, // Gap 0.2 < 0.5
      { start: 15, end: 20, duration: 5, score: 0.8 }, // Gap 5.0 > 0.5
    ];

    const result = directorProcessor.postProcessSegments(input, {
      mergeGap: 0.5,
    });

    expect(result).toHaveLength(2);
    expect(result[0]?.start).toBe(0);
    expect(result[0]?.end).toBe(10); // Merged
    expect(result[1]?.start).toBe(15);
  });

  it("should clamp max duration", () => {
    const input: Segment[] = [
      { start: 0, end: 100, duration: 100, score: 0.8 },
    ];

    const result = directorProcessor.postProcessSegments(input, {
      maxDuration: 30,
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.duration).toBe(30);
    expect(result[0]?.end).toBe(30);
  });

  it("should filter short segments", () => {
    const input: Segment[] = [
      { start: 0, end: 1, duration: 1, score: 0.8 }, // Too short
      { start: 10, end: 20, duration: 10, score: 0.8 },
    ];

    const result = directorProcessor.postProcessSegments(input, {
      minDuration: 5,
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.start).toBe(10);
  });

  it("should cap max candidates", () => {
    // Generate 30 segments
    const input: Segment[] = Array.from({ length: 30 }).map((_, i) => ({
      start: i * 10,
      end: i * 10 + 5,
      duration: 5,
      score: 0.8,
    }));

    const result = directorProcessor.postProcessSegments(input, {
      maxCandidates: 10,
    });

    expect(result).toHaveLength(10);
  });
});
