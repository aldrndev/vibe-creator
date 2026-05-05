import { describe, expect, it, vi } from 'vitest';
import {
  buildUniformWindows,
  pickNonOverlappingCandidates,
  splitSegmentAtSmartPauses,
  videoAnalysisService,
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

  it('builds long uniform fallback candidates for 90-120s targets', async () => {
    const energySpy = vi
      .spyOn(videoAnalysisService, 'analyzeSegmentEnergy')
      .mockResolvedValue({ meanVolume: -18, maxVolume: -6 });

    const candidates = await videoAnalysisService.refineSegments(
      buildUniformWindows(180),
      '/tmp/audio.wav',
      {
        minDuration: 90,
        maxDuration: 120,
        maxCandidates: 5,
      },
    );

    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates.some((candidate) => candidate.duration >= 90)).toBe(true);
    expect(candidates.every((candidate) => candidate.duration <= 120)).toBe(true);

    energySpy.mockRestore();
  });

  it('keeps nearest fallback candidates when no candidate reaches the target minimum', async () => {
    const energySpy = vi
      .spyOn(videoAnalysisService, 'analyzeSegmentEnergy')
      .mockResolvedValue({ meanVolume: -20, maxVolume: -8 });

    const candidates = await videoAnalysisService.refineSegments(
      [{ start: 0, end: 82, duration: 82, score: 0.8, activeDuration: 78 }],
      '/tmp/audio.wav',
      {
        minDuration: 90,
        maxDuration: 120,
        maxCandidates: 5,
      },
    );

    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.duration).toBe(82);

    energySpy.mockRestore();
  });
});
