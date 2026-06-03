import { describe, expect, it } from 'vitest';
import { loopCreatorProjectDocumentSchema, loopPreviewResponseSchema } from './loop.schemas';
import {
  calculateLoopTiming,
  resolveAutomaticTransitionDurationMs,
  resolveLoopOutputDimensions,
} from './loop-calculation';

describe('calculateLoopTiming', () => {
  it('keeps complete repeat cycles while reaching the selected target', () => {
    expect(
      calculateLoopTiming({
        selectedSegmentDurationMs: 40_000,
        targetDurationMs: 5 * 60_000,
        tierMaxDurationMs: 15 * 60_000,
        transitionMode: 'repeat',
      }),
    ).toEqual({
      transitionDurationMs: 0,
      cycleDurationMs: 40_000,
      cycleCount: 8,
      actualDurationMs: 320_000,
      adjustedToTier: false,
    });
  });

  it('automatically applies the original seamless overlap for smooth cycles', () => {
    expect(
      calculateLoopTiming({
        selectedSegmentDurationMs: 10_000,
        targetDurationMs: 30_000,
        tierMaxDurationMs: 60_000,
        transitionMode: 'smooth',
      }),
    ).toMatchObject({
      transitionDurationMs: 2000,
      cycleDurationMs: 8000,
      cycleCount: 4,
      actualDurationMs: 32_000,
    });
  });

  it('caps output to the largest complete cycle within the tier maximum', () => {
    expect(
      calculateLoopTiming({
        selectedSegmentDurationMs: 40_000,
        targetDurationMs: 30 * 60_000,
        tierMaxDurationMs: 15 * 60_000,
        transitionMode: 'repeat',
      }),
    ).toMatchObject({
      cycleCount: 22,
      actualDurationMs: 880_000,
      adjustedToTier: true,
    });
  });

  it('scales short smooth transitions at thirty percent and caps longer videos at two seconds', () => {
    expect(resolveAutomaticTransitionDurationMs(2000)).toBe(600);
    expect(resolveAutomaticTransitionDurationMs(5000)).toBe(1500);
    expect(resolveAutomaticTransitionDurationMs(8000)).toBe(2000);
  });

  it('reads legacy manual duration drafts but keeps automatic smooth settings', () => {
    const parsed = loopCreatorProjectDocumentSchema.parse({
      kind: 'loop-creator-project',
      schemaVersion: 1,
      savedAt: new Date().toISOString(),
      trim: { enabled: false, startMs: 0 },
      audioMuted: false,
      transition: { mode: 'smooth', durationMs: 500 },
      output: { targetDurationMs: 300_000, aspectRatio: 'original' },
    });

    expect(parsed.transition).toEqual({ mode: 'smooth' });
  });

  it('validates a completed preview contract without exposing a file path', () => {
    const response = loopPreviewResponseSchema.parse({
      previewId: 'preview-1',
      status: 'COMPLETED',
      progress: 100,
      phase: 'COMPLETED',
      reused: true,
      previewUrl: '/api/v1/loop/previews/preview-1/file',
      expiresAt: new Date().toISOString(),
    });

    expect(response.previewUrl).toContain('/loop/previews/preview-1/file');
  });
});

describe('resolveLoopOutputDimensions', () => {
  it('uses tier-sized blurred formats while preserving original dimensions', () => {
    expect(resolveLoopOutputDimensions('original', { width: 854, height: 480 }, 'FREE')).toEqual({
      width: 854,
      height: 480,
    });
    expect(resolveLoopOutputDimensions('9:16', { width: 854, height: 480 }, 'FREE')).toEqual({
      width: 720,
      height: 1280,
    });
  });
});
