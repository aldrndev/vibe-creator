import {
  createVideoLayer,
  type ModernProjectSettings,
  type VideoLayer,
} from '@vibe-creator/shared';
import { describe, expect, it } from 'vitest';
import { editorAnimationCatalog } from '@/lib/modern-editor-animation-catalog';
import {
  buildVisualStylePresetUpdate,
  canvasBackgroundPresets,
  canvasFormatPresets,
  isVisualStylePresetActive,
  textStylePresets,
  visualFramePresets,
  visualLookPresets,
  visualMotionPresets,
  visualStylePresets,
} from '@/lib/modern-editor-preset-catalog';

function expectUniqueIds(items: readonly { id: string }[]) {
  const ids = items.map((item) => item.id);
  expect(new Set(ids).size).toBe(ids.length);
}

function getVisualPreset(id: string) {
  const preset = visualStylePresets.find((item) => item.id === id);
  if (!preset) {
    throw new Error(`Missing visual preset: ${id}`);
  }

  return preset;
}

describe('modern editor preset catalog', () => {
  it('keeps preset ids unique', () => {
    expectUniqueIds(textStylePresets);
    expectUniqueIds(visualStylePresets);
    expectUniqueIds(canvasFormatPresets);
    expectUniqueIds(canvasBackgroundPresets);
    expectUniqueIds(editorAnimationCatalog);
  });

  it('includes plug-and-play text, visual, canvas, and animation presets', () => {
    expect(textStylePresets.map((preset) => preset.id)).toEqual(
      expect.arrayContaining([
        'viral-caption',
        'bold-hook',
        'meme-text',
        'clean-subtitle',
        'lower-third',
        'quote',
        'cta',
      ]),
    );
    expect(visualStylePresets.map((preset) => preset.id)).toEqual(
      expect.arrayContaining([
        'fit',
        'fill',
        'blur-bg',
        'normal',
        'bw',
        'cinematic',
        'vivid',
        'warm',
        'cold',
        'still',
        'zoom-in',
        'zoom-out',
      ]),
    );
    expect(
      canvasBackgroundPresets.find((preset) => preset.id === 'blur-content')?.settings,
    ).toEqual(
      expect.objectContaining({
        backgroundMode: 'blur',
        backgroundBlurAmount: expect.any(Number),
        backgroundBlurZoom: expect.any(Number),
      }),
    );
    expect(canvasBackgroundPresets.map((preset) => preset.id)).toEqual(
      expect.arrayContaining([
        'gradient-dark-fade',
        'gradient-warm-glow',
        'gradient-brand-orange',
        'gradient-blue-night',
        'gradient-clean-light',
        'gradient-teal-pop',
      ]),
    );
    expect(
      canvasBackgroundPresets.find((preset) => preset.id === 'gradient-blue-night')?.settings,
    ).toEqual(
      expect.objectContaining({
        backgroundMode: 'gradient',
        backgroundGradientFrom: '#020617',
        backgroundGradientTo: '#2563eb',
        backgroundGradientAngle: 135,
      }),
    );
    expect(editorAnimationCatalog.map((preset) => preset.category)).toEqual(
      expect.arrayContaining(['Text In', 'Text Out', 'Text Loop', 'Visual In', 'Visual Out']),
    );
  });

  it('groups visual presets for video inspector', () => {
    expect(visualFramePresets.map((preset) => preset.id)).toEqual(['fit', 'fill', 'blur-bg']);
    expect(visualLookPresets.map((preset) => preset.id)).toEqual([
      'normal',
      'bw',
      'cinematic',
      'vivid',
      'warm',
      'cold',
    ]);
    expect(visualMotionPresets.map((preset) => preset.id)).toEqual([
      'still',
      'zoom-in',
      'zoom-out',
    ]);
  });

  it('builds safe visual preset updates while preserving video data', () => {
    const layer = createVideoLayer('video-layer', 'asset-video', 0, 0, 5000);
    layer.data.volume = 0.4;
    layer.data.loop = true;
    layer.data.trimStartMs = 900;
    layer.data.trimEndMs = 4200;

    const fillPreset = getVisualPreset('fill');
    const fitPreset = getVisualPreset('fit');
    const warmPreset = getVisualPreset('warm');
    const zoomPreset = getVisualPreset('zoom-in');

    expect(fitPreset.canvasSettings).toEqual(expect.objectContaining({ backgroundMode: 'solid' }));

    const fillUpdate = buildVisualStylePresetUpdate(layer, fillPreset);
    expect(fillUpdate.data).toEqual(
      expect.objectContaining({
        fit: 'cover',
        volume: 0.4,
        loop: true,
        trimStartMs: 900,
        trimEndMs: 4200,
      }),
    );

    const warmUpdate = buildVisualStylePresetUpdate(layer, warmPreset);
    const warmData = warmUpdate.data as VideoLayer['data'] | undefined;
    expect(warmData?.effects).toEqual(expect.objectContaining({ filter: 'warm' }));

    const zoomUpdate = buildVisualStylePresetUpdate(layer, zoomPreset);
    const zoomData = zoomUpdate.data as VideoLayer['data'] | undefined;
    expect(zoomData?.effects).toEqual(expect.objectContaining({ motion: 'zoom-in' }));
  });

  it('detects active visual presets from layer data and canvas settings', () => {
    const layer = createVideoLayer('video-layer', 'asset-video', 0, 0, 5000);
    const fitPreset = getVisualPreset('fit');
    const fillPreset = getVisualPreset('fill');
    const warmPreset = getVisualPreset('warm');
    const cinematicPreset = getVisualPreset('cinematic');
    const zoomPreset = getVisualPreset('zoom-in');
    const blurPreset = getVisualPreset('blur-bg');
    const blurSettings: ModernProjectSettings = {
      width: 1080,
      height: 1920,
      fps: 30,
      durationMs: 0,
      backgroundColor: '#000000',
      backgroundMode: 'blur',
    };
    const solidSettings: ModernProjectSettings = {
      ...blurSettings,
      backgroundMode: 'solid',
    };

    layer.data.fit = 'cover';
    layer.data.effects.filter = 'warm';
    layer.data.effects.motion = 'none';

    expect(isVisualStylePresetActive(layer, fillPreset)).toBe(true);
    expect(isVisualStylePresetActive(layer, warmPreset)).toBe(true);

    layer.data.effects.motion = 'zoom-in';
    expect(isVisualStylePresetActive(layer, cinematicPreset)).toBe(true);
    expect(isVisualStylePresetActive(layer, warmPreset)).toBe(false);
    expect(isVisualStylePresetActive(layer, zoomPreset)).toBe(true);

    layer.data.fit = 'contain';
    expect(isVisualStylePresetActive(layer, blurPreset, blurSettings)).toBe(true);
    expect(isVisualStylePresetActive(layer, fitPreset, blurSettings)).toBe(false);
    expect(isVisualStylePresetActive(layer, fitPreset, solidSettings)).toBe(true);
    expect(isVisualStylePresetActive(layer, blurPreset, solidSettings)).toBe(false);
  });
});
