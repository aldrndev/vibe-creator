import { describe, expect, it } from 'vitest';
import {
  resolveLoopPreviewStartSeconds,
  shouldRestartLoopPreview,
  shouldRestartPlayingLoopPreview,
} from './loop-preview-utils';

describe('loop preview timing', () => {
  it('starts playback at the selected trim start', () => {
    expect(resolveLoopPreviewStartSeconds(2500)).toBe(2.5);
    expect(resolveLoopPreviewStartSeconds(-100)).toBe(0);
  });

  it('restarts playback as it reaches the selected trim end', () => {
    expect(shouldRestartLoopPreview(7.96, 8000)).toBe(false);
    expect(shouldRestartLoopPreview(7.97, 8000)).toBe(true);
    expect(shouldRestartLoopPreview(8, 8000)).toBe(true);
  });

  it('only restarts the inline loop while the preview is playing', () => {
    expect(shouldRestartPlayingLoopPreview(false, 7.97, 8000)).toBe(true);
    expect(shouldRestartPlayingLoopPreview(true, 7.97, 8000)).toBe(false);
  });
});
