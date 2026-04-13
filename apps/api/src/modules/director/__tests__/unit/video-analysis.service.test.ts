import { describe, expect, it } from 'vitest';
import {
  buildUniformWindows,
  pickNonOverlappingCandidates,
  splitSegmentAtSmartPauses,
} from '@/modules/director/processing/video-analysis.service';

describe('video-analysis segmentation helpers', () => {
  it('builds overlapping uniform fallback windows', () => {
    const windows = buildUniformWindows(140);

    expect(windows.length).toBeGreaterThan(3);
    const first = windows[0];
    const second = windows.find((window) => window.start > (first?.start ?? 0));

    expect(first?.duration).toBeGreaterThanOrEqual(18);
    expect(first?.tags).toContain('UNIFORM_FALLBACK');
    expect(second).toBeDefined();
    if (first && second) {
      expect(second.start).toBeLessThan(first.end);
    }
  });

  it('splits long segments by nearest pause anchor and keeps dialog completion when close', () => {
    const chunks = splitSegmentAtSmartPauses({
      segment: {
        start: 0,
        end: 95,
        duration: 95,
        score: 0.8,
        activeDuration: 92,
        pauseAnchors: [20, 41, 63, 86, 95],
      },
      minDuration: 15,
      preferredMaxDuration: 60,
      hardMaxDuration: 80,
    });

    expect(chunks.length).toBe(2);
    expect(chunks[0]?.end).toBe(63);
    expect(chunks[1]?.start).toBe(63);
    expect(chunks[1]?.end).toBe(95);
  });

  it('removes overlapping and near-adjacent candidates to avoid reused scenes', () => {
    const selected = pickNonOverlappingCandidates(
      [
        { start: 0, end: 30, duration: 30, score: 0.95 },
        { start: 29.8, end: 55, duration: 25.2, score: 0.92 }, // overlap
        { start: 30.05, end: 58, duration: 27.95, score: 0.9 }, // too close gap
        { start: 31, end: 60, duration: 29, score: 0.88 }, // safe
      ],
      10,
    );

    expect(selected).toHaveLength(2);
    expect(selected[0]?.start).toBe(0);
    expect(selected[1]?.start).toBe(31);
  });
});
