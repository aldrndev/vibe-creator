import { describe, expect, it } from 'vitest';
import { resolveModernProjectSettings } from './modern-editor-store-helpers';

describe('modern editor store helpers', () => {
  it('fills canvas background defaults for legacy settings', () => {
    const settings = resolveModernProjectSettings({
      width: 1080,
      height: 1920,
      fps: 30,
      durationMs: 5000,
      backgroundColor: '#000000',
      backgroundMode: 'solid',
    });

    expect(settings).toEqual(
      expect.objectContaining({
        backgroundOpacity: 1,
        backgroundGradientFrom: '#111827',
        backgroundGradientTo: '#ff4b1f',
        backgroundGradientAngle: 135,
        backgroundImageAssetId: null,
        backgroundImageFit: 'cover',
        backgroundImageBlurAmount: 0,
        backgroundImageDim: 0,
        backgroundImagePositionX: 50,
        backgroundImagePositionY: 50,
        backgroundImageScale: 1,
      }),
    );
  });

  it('clamps canvas background controls', () => {
    const settings = resolveModernProjectSettings({
      backgroundOpacity: 3,
      backgroundGradientAngle: 720,
      backgroundImageBlurAmount: 90,
      backgroundImageDim: 1,
      backgroundImagePositionX: -20,
      backgroundImagePositionY: 140,
      backgroundImageScale: 4,
    });

    expect(settings.backgroundOpacity).toBe(1);
    expect(settings.backgroundGradientAngle).toBe(360);
    expect(settings.backgroundImageBlurAmount).toBe(40);
    expect(settings.backgroundImageDim).toBe(0.6);
    expect(settings.backgroundImagePositionX).toBe(0);
    expect(settings.backgroundImagePositionY).toBe(100);
    expect(settings.backgroundImageScale).toBe(2);
  });
});
