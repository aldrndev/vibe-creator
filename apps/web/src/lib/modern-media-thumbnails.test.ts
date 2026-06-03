import { describe, expect, it } from 'vitest';
import {
  createThumbnailDataUrlFromSource,
  generateEditorAssetThumbnailUrl,
  getEditorThumbnailSize,
  getVideoThumbnailSeekTime,
  getVideoTimelineThumbnailCount,
  getVideoTimelineThumbnailSeekTimes,
  type ThumbnailCanvasAdapter,
} from './modern-media-thumbnails';

describe('modern media thumbnails', () => {
  it('keeps image thumbnail dimensions inside the configured max width', () => {
    expect(getEditorThumbnailSize(1920, 1080, 320)).toEqual({ width: 320, height: 180 });
    expect(getEditorThumbnailSize(160, 90, 320)).toEqual({ width: 160, height: 90 });
  });

  it('chooses an early safe seek time for video thumbnails', () => {
    expect(getVideoThumbnailSeekTime(20)).toBe(0.5);
    expect(getVideoThumbnailSeekTime(3)).toBeCloseTo(0.3);
    expect(getVideoThumbnailSeekTime(0)).toBe(0);
  });

  it('chooses bounded frame counts for timeline filmstrips', () => {
    expect(getVideoTimelineThumbnailCount(0)).toBe(1);
    expect(getVideoTimelineThumbnailCount(4)).toBe(4);
    expect(getVideoTimelineThumbnailCount(35)).toBe(12);
    expect(getVideoTimelineThumbnailCount(120)).toBe(12);
  });

  it('spreads timeline thumbnails across the video duration', () => {
    expect(getVideoTimelineThumbnailSeekTimes(20, 5)).toEqual([0.5, 5.25, 10, 14.75, 19.5]);
    expect(getVideoTimelineThumbnailSeekTimes(3, 4)).toEqual([0.24, 1.08, 1.92, 2.76]);
    expect(getVideoTimelineThumbnailSeekTimes(0, 5)).toEqual([0]);
  });

  it('creates thumbnail data with an injected canvas adapter', () => {
    const adapter: ThumbnailCanvasAdapter = {
      createThumbnail: (_source, size, mimeType, quality) =>
        `${mimeType}:${size.width}x${size.height}:${quality}`,
    };

    expect(
      createThumbnailDataUrlFromSource({
        adapter,
        source: {},
        sourceWidth: 640,
        sourceHeight: 360,
      }),
    ).toBe('image/jpeg:320x180:0.78');
  });

  it('fails softly when thumbnail generation is unavailable', async () => {
    await expect(generateEditorAssetThumbnailUrl('AUDIO', '/audio.mp3')).resolves.toBeNull();
  });
});
