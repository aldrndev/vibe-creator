import { describe, expect, it } from 'vitest';
import {
  blendHexColorWithBlack,
  buildBackgroundBaseFilters,
  buildBackgroundInputSource,
  resolveGradientLine,
} from './modern-background.processor';

describe('modern background processor', () => {
  it('resolves CSS-like gradient lines for common angles', () => {
    expect(resolveGradientLine(100, 200, 0)).toEqual({ x0: 50, y0: 200, x1: 50, y1: 0 });
    expect(resolveGradientLine(100, 200, 90)).toEqual({ x0: 0, y0: 100, x1: 100, y1: 100 });
    expect(resolveGradientLine(100, 200, 180)).toEqual({ x0: 50, y0: 0, x1: 50, y1: 200 });
    expect(resolveGradientLine(100, 100, 135)).toEqual({ x0: 0, y0: 0, x1: 100, y1: 100 });
  });

  it('blends solid colors with black for background opacity', () => {
    expect(blendHexColorWithBlack('#ff4b1f', 0.5)).toBe('#802610');
    expect(blendHexColorWithBlack('#ff4b1f', 1)).toBe('#ff4b1f');
    expect(blendHexColorWithBlack('#ff4b1f', 0)).toBe('#000000');
  });

  it('builds gradient source filters from settings', () => {
    const source = buildBackgroundInputSource(
      {
        width: 1080,
        height: 1920,
        fps: 30,
        backgroundMode: 'gradient',
        backgroundOpacity: 1,
        backgroundGradientFrom: '#020617',
        backgroundGradientTo: '#2563eb',
        backgroundGradientAngle: 135,
      },
      '5.000',
    );

    expect(source).toContain('gradients=s=1080x1920');
    expect(source).toContain('r=30');
    expect(source).toContain('c0=0x020617');
    expect(source).toContain('c1=0x2563eb');
    expect(source).toContain('d=5.000');
    expect(source).toContain('speed=0');
  });

  it('adds alpha to blur background filters when opacity is below 1', () => {
    const result = buildBackgroundBaseFilters({
      settings: {
        width: 1080,
        height: 1920,
        fps: 30,
        backgroundMode: 'blur',
        backgroundOpacity: 0.42,
      },
      visualClips: [
        {
          inputIndex: 1,
          mediaType: 'video',
          startTime: 0,
          endTime: 5,
          timelineStartMs: 0,
          timelineEndMs: 5000,
          zIndex: 0,
        },
      ],
    });

    expect(result.label).toBe('baseBlur0');
    expect(result.filters.join(';')).toContain('colorchannelmixer=aa=0.42');
  });

  it('renders a cover image background under the layer stack with visual controls', () => {
    const result = buildBackgroundBaseFilters({
      backgroundImageInputIndex: 1,
      settings: {
        width: 1080,
        height: 1920,
        fps: 30,
        backgroundMode: 'image',
        backgroundOpacity: 0.8,
        backgroundImageFit: 'cover',
        backgroundImageBlurAmount: 4,
        backgroundImageDim: 0.2,
        backgroundImagePositionX: 45,
        backgroundImagePositionY: 60,
        backgroundImageScale: 1.2,
      },
      visualClips: [],
    });

    const filters = result.filters.join(';');
    expect(result.label).toBe('baseImage');
    expect(filters).toContain('[1:v]setpts=PTS-STARTPTS');
    expect(filters).toContain('force_original_aspect_ratio=increase');
    expect(filters).toContain('crop=1080:1920');
    expect(filters).toContain('gblur=sigma=4');
    expect(filters).toContain('drawbox=color=black@0.2');
    expect(filters).toContain('colorchannelmixer=aa=0.8');
    expect(filters).toContain('[base0][imageBg]overlay=0:0[baseImage]');
  });

  it('pads a fit image background against its fallback canvas', () => {
    const result = buildBackgroundBaseFilters({
      backgroundImageInputIndex: 1,
      settings: {
        width: 1920,
        height: 1080,
        fps: 30,
        backgroundMode: 'image',
        backgroundImageFit: 'contain',
      },
      visualClips: [],
    });

    const filters = result.filters.join(';');
    expect(filters).toContain('force_original_aspect_ratio=decrease');
    expect(filters).toContain('pad=1920:1080');
  });
});
