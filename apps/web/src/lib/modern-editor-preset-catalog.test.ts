import { describe, expect, it } from 'vitest';
import { editorAnimationCatalog } from '@/lib/modern-editor-animation-catalog';
import {
  canvasBackgroundPresets,
  canvasFormatPresets,
  textStylePresets,
  visualStylePresets,
} from '@/lib/modern-editor-preset-catalog';

function expectUniqueIds(items: readonly { id: string }[]) {
  const ids = items.map((item) => item.id);
  expect(new Set(ids).size).toBe(ids.length);
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
      expect.arrayContaining(['fit', 'fill', 'blur-bg', 'cinematic', 'vivid', 'warm']),
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
    expect(editorAnimationCatalog.map((preset) => preset.category)).toEqual(
      expect.arrayContaining(['Text In', 'Text Out', 'Text Loop', 'Visual In', 'Visual Out']),
    );
  });
});
