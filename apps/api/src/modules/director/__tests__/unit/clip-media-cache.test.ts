import { describe, expect, it } from 'vitest';
import {
  getClipPosterCacheFileName,
  getClipPreviewCacheFileName,
} from '@/modules/director/clip-media-cache';

const baseInput = {
  assetId: 'asset-1',
  candidateId: 'clip-1',
  startMs: 1000,
  endMs: 4000,
  sourceFileName: 'source.mp4',
} as const;

describe('clip-media-cache', () => {
  it('returns a deterministic preview file name', () => {
    const first = getClipPreviewCacheFileName(baseInput);
    const second = getClipPreviewCacheFileName(baseInput);

    expect(first).toBe(second);
    expect(first).toMatch(/^clip-preview-[a-f0-9]{40}\.mp4$/);
  });

  it('returns a deterministic poster file name', () => {
    const first = getClipPosterCacheFileName(baseInput);
    const second = getClipPosterCacheFileName(baseInput);

    expect(first).toBe(second);
    expect(first).toMatch(/^poster-[a-f0-9]{40}\.jpg$/);
  });

  it('changes the cache key when clip timing changes', () => {
    const first = getClipPreviewCacheFileName(baseInput);
    const second = getClipPreviewCacheFileName({
      ...baseInput,
      startMs: 2000,
      endMs: 5000,
    });

    expect(first).not.toBe(second);
  });
});
