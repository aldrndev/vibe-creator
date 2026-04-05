import { describe, expect, it } from 'vitest';
import { resolveSelectedClipRangeMs } from '@/modules/director/selected-clip-range';

describe('resolveSelectedClipRangeMs', () => {
  it('uses trim offsets relative to the candidate range', () => {
    expect(
      resolveSelectedClipRangeMs({
        candidateStartMs: 10_000,
        candidateEndMs: 22_000,
        trimStartMs: 1_500,
        trimEndMs: 2_000,
      }),
    ).toEqual({
      startMs: 11_500,
      endMs: 20_000,
    });
  });

  it('rejects clips that become too short after trimming', () => {
    expect(() =>
      resolveSelectedClipRangeMs({
        candidateStartMs: 10_000,
        candidateEndMs: 10_400,
        trimStartMs: 100,
        trimEndMs: 100,
      }),
    ).toThrow('Durasi klip terlalu pendek setelah trim');
  });
});
