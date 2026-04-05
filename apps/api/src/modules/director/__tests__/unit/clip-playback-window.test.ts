import { describe, expect, it } from 'vitest';
import { getClipPlaybackWindow } from '@/modules/director/clip-playback-window';

describe('getClipPlaybackWindow', () => {
  it('returns the full selected clip duration', () => {
    const result = getClipPlaybackWindow({
      startMs: 5000,
      endMs: 17000,
    });

    expect(result).toEqual({
      startSec: 5,
      durationSec: 12,
    });
  });

  it('guards against zero or negative duration clips', () => {
    const result = getClipPlaybackWindow({
      startMs: 1000,
      endMs: 1000,
    });

    expect(result.startSec).toBe(1);
    expect(result.durationSec).toBe(0.1);
  });
});
