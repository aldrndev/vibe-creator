import { createTextLayer } from '@vibe-creator/shared';
import { describe, expect, it } from 'vitest';
import type { EditorAsset } from '@/stores/editor-store';
import {
  buildEditorMediaWaveformBars,
  getWaveformBarHeightClass,
  resolveEditorAssetPreviewUrl,
  resolveEditorMediaPreviewKind,
} from './modern-editor-media-preview';

describe('modern editor media preview', () => {
  it('resolves thumbnailUrl before timeline thumbnails and asset URLs', () => {
    const asset: EditorAsset = {
      id: 'asset-image',
      name: 'image.png',
      type: 'IMAGE',
      url: '/image.png',
      thumbnailUrl: '/thumb.jpg',
      thumbnails: ['/strip.jpg'],
    };

    expect(resolveEditorAssetPreviewUrl(asset)).toBe('/thumb.jpg');
  });

  it('falls back to thumbnail strips and then image asset URLs', () => {
    expect(
      resolveEditorAssetPreviewUrl({
        id: 'asset-video',
        name: 'video.mp4',
        type: 'VIDEO',
        url: '/video.mp4',
        thumbnails: ['/video-strip.jpg'],
      }),
    ).toBe('/video-strip.jpg');

    expect(
      resolveEditorAssetPreviewUrl({
        id: 'asset-image',
        name: 'image.png',
        type: 'IMAGE',
        url: '/image.png',
      }),
    ).toBe('/image.png');
  });

  it('does not use raw video or audio URLs as image previews', () => {
    expect(
      resolveEditorAssetPreviewUrl({
        id: 'asset-video',
        name: 'video.mp4',
        type: 'VIDEO',
        url: '/video.mp4',
      }),
    ).toBeNull();
    expect(
      resolveEditorAssetPreviewUrl({
        id: 'asset-audio',
        name: 'audio.mp3',
        type: 'AUDIO',
        url: '/audio.mp3',
      }),
    ).toBeNull();
  });

  it('resolves preview kind from asset before layer fallback', () => {
    expect(
      resolveEditorMediaPreviewKind({
        asset: { id: 'asset-audio', name: 'audio.mp3', type: 'AUDIO', url: '/audio.mp3' },
      }),
    ).toBe('AUDIO');
    expect(
      resolveEditorMediaPreviewKind({ layer: createTextLayer('text-layer', 'Title', 0, 0, 5000) }),
    ).toBe('TEXT');
  });

  it('creates deterministic waveform bars for audio fallback previews', () => {
    expect(buildEditorMediaWaveformBars('audio-layer', 4)).toEqual(
      buildEditorMediaWaveformBars('audio-layer', 4),
    );
    expect(buildEditorMediaWaveformBars('audio-layer', 4)).toHaveLength(4);
  });

  it('maps waveform heights to stable Tailwind classes', () => {
    expect(getWaveformBarHeightClass(90)).toBe('h-8');
    expect(getWaveformBarHeightClass(20)).toBe('h-4');
  });
});
