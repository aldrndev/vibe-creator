import { describe, expect, it } from 'vitest';
import {
  isConfigCompatible,
  preferCandidatesWithinTargetDurationRange,
  resolveClipDurationConfig,
  resolveHardMaxCandidateDurationMs,
  resolveTargetDurationRangeConfig,
} from '@/modules/director/analysis-duration-config';

describe('analysis-duration-config', () => {
  it('resolves explicit 60-90 duration range into clip bounds', () => {
    const config = resolveTargetDurationRangeConfig('60-90');

    expect(config).toEqual({
      targetDurationRange: '60-90',
      minClipDurationMs: 60_000,
      maxClipDurationMs: 90_000,
    });
  });

  it('parses duration range from stored analysis config', () => {
    const config = resolveClipDurationConfig({
      minClipDuration: 20_000,
      maxClipDuration: 40_000,
    });

    expect(config.targetDurationRange).toBe('20-40');
    expect(config.minClipDurationMs).toBe(20_000);
    expect(config.maxClipDurationMs).toBe(40_000);
  });

  it('checks analysis config compatibility against requested duration range', () => {
    expect(
      isConfigCompatible(
        {
          minClipDuration: 90_000,
          maxClipDuration: 120_000,
        },
        '90-120',
      ),
    ).toBe(true);
    expect(
      isConfigCompatible(
        {
          minClipDuration: 40_000,
          maxClipDuration: 60_000,
        },
        '90-120',
      ),
    ).toBe(false);
  });

  it('caps hard max duration to 120 seconds', () => {
    expect(resolveHardMaxCandidateDurationMs(120_000)).toBe(120_000);
    expect(resolveHardMaxCandidateDurationMs(60_000)).toBe(90_000);
  });

  it('keeps in-range candidates when target range matches', () => {
    const result = preferCandidatesWithinTargetDurationRange(
      [
        { id: 'a', startMs: 0, endMs: 35_000, rank: 2 },
        { id: 'b', startMs: 40_000, endMs: 88_000, rank: 1 },
        { id: 'c', startMs: 90_000, endMs: 125_000, rank: 3 },
      ],
      '20-40',
    );

    expect(result.fallbackApplied).toBe(false);
    expect(result.candidates.map((candidate) => candidate.id)).toEqual(['a', 'c']);
  });

  it('falls back to nearest candidates when none are in requested range', () => {
    const result = preferCandidatesWithinTargetDurationRange(
      [
        { id: 'a', startMs: 0, endMs: 42_000, rank: 2 },
        { id: 'b', startMs: 50_000, endMs: 88_000, rank: 1 },
      ],
      '90-120',
    );

    expect(result.fallbackApplied).toBe(true);
    expect(result.candidates.map((candidate) => candidate.id)).toEqual(['a']);
  });
});
