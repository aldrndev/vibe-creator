import { describe, expect, it } from 'vitest';
import type { SubtitleSegment } from './transcribe-normalizer';
import {
  getTranscriptLastEndMs,
  getTranscriptTailRecoveryWindow,
  offsetRecoveredTailSegments,
} from './transcript-tail-recovery';

describe('transcript-tail-recovery', () => {
  it('detects a missing transcript tail for a 60 second clip', () => {
    const segments: SubtitleSegment[] = [{ startMs: 0, endMs: 40_000, text: 'speech ends early' }];

    const window = getTranscriptTailRecoveryWindow(segments, 60_000);

    expect(getTranscriptLastEndMs(segments)).toBe(40_000);
    expect(window).toEqual({
      startMs: 38_000,
      endMs: 60_000,
      offsetMs: 38_000,
      lastTranscriptEndMs: 40_000,
    });
  });

  it('does not retry when transcript already reaches the tail', () => {
    const segments: SubtitleSegment[] = [{ startMs: 0, endMs: 58_000, text: 'almost complete' }];

    expect(getTranscriptTailRecoveryWindow(segments, 60_000)).toBeNull();
  });

  it('uses a shorter missing-tail threshold for shorter clips', () => {
    const segments: SubtitleSegment[] = [
      { startMs: 0, endMs: 17_000, text: 'short clip ends early' },
    ];

    const window = getTranscriptTailRecoveryWindow(segments, 20_000);

    expect(window).toEqual({
      startMs: 15_000,
      endMs: 20_000,
      offsetMs: 15_000,
      lastTranscriptEndMs: 17_000,
    });
  });

  it('offsets recovered tail words and removes overlap duplicates', () => {
    const recoveredTail: SubtitleSegment[] = [
      {
        startMs: 1_000,
        endMs: 15_000,
        text: 'old words new tail words',
        words: [
          { startMs: 1_000, endMs: 1_500, text: 'old' },
          { startMs: 12_000, endMs: 12_500, text: 'new' },
          { startMs: 13_000, endMs: 13_500, text: 'tail' },
          { startMs: 14_000, endMs: 14_500, text: 'words' },
        ],
      },
    ];

    const offsetSegments = offsetRecoveredTailSegments(recoveredTail, {
      startMs: 38_000,
      endMs: 60_000,
      offsetMs: 38_000,
      lastTranscriptEndMs: 40_000,
    });

    expect(offsetSegments).toHaveLength(1);
    expect(offsetSegments[0]).toMatchObject({
      startMs: 50_000,
      endMs: 52_500,
      text: 'new tail words',
    });
    expect(offsetSegments[0]?.words?.map((word) => word.text)).toEqual(['new', 'tail', 'words']);
  });
});
