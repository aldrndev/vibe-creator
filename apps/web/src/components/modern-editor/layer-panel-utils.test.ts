import { createTextLayer, createVideoLayer } from '@vibe-creator/shared';
import { describe, expect, it } from 'vitest';
import type { EditorAsset } from '@/stores/editor-store';
import {
  formatLayerDuration,
  formatLayerTime,
  getLayerDisplayName,
  getLayerTypeLabel,
  getTextLayerFallbackLabel,
  getTextLayerPreviewLabel,
} from './layer-panel-utils';

const asset: EditorAsset = {
  id: 'asset-video',
  name: 'opening-shot.mp4',
  type: 'VIDEO',
  url: 'blob:video',
};

describe('layer panel utils', () => {
  it('uses text content or media asset names for layer labels', () => {
    const textLayer = createTextLayer('text-layer', '  Breaking news title  ', 0, 0, 2000);
    const videoLayer = createVideoLayer('video-layer', asset.id, 1, 0, 5000);

    expect(getLayerDisplayName(textLayer, [])).toBe('Breaking news title');
    expect(getLayerDisplayName(videoLayer, [asset])).toBe('opening-shot.mp4');
  });

  it('uses compact fallback labels for empty text and subtitle layers', () => {
    const textLayer = createTextLayer('layer-text-empty', '   ', 0, 0, 2000);
    const subtitleLayer = createTextLayer('layer-subtitle-empty', '   ', 0, 0, 2000);

    expect(getTextLayerFallbackLabel(textLayer)).toBe('Text');
    expect(getTextLayerFallbackLabel(subtitleLayer)).toBe('Subtitle');
    expect(getLayerDisplayName(textLayer, [])).toBe('Text');
    expect(getLayerDisplayName(subtitleLayer, [])).toBe('Subtitle');
  });

  it('hides default editor placeholder copy in layer labels', () => {
    const textLayer = createTextLayer('layer-text-placeholder', 'Text layer', 0, 0, 2000);
    const subtitleLayer = createTextLayer(
      'layer-subtitle-placeholder',
      'Subtitle text...',
      0,
      0,
      2000,
    );

    expect(getTextLayerPreviewLabel(textLayer)).toBe('Text');
    expect(getTextLayerPreviewLabel(subtitleLayer)).toBe('Subtitle');
    expect(getLayerDisplayName(textLayer, [])).toBe('Text');
    expect(getLayerDisplayName(subtitleLayer, [])).toBe('Subtitle');
  });

  it('formats compact timing labels', () => {
    const videoLayer = createVideoLayer('video-layer', asset.id, 1, 5000, 72_000);

    expect(formatLayerTime(2500)).toBe('2.5s');
    expect(formatLayerTime(72_000)).toBe('1:12');
    expect(formatLayerDuration(videoLayer)).toBe('1:07');
  });

  it('returns readable type labels', () => {
    expect(getLayerTypeLabel('text')).toBe('Text');
    expect(getLayerTypeLabel('audio')).toBe('Audio');
  });
});
