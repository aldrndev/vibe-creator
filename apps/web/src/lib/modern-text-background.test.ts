import { describe, expect, it } from 'vitest';
import {
  createTextBackgroundData,
  normalizeTextBackgroundColor,
  resolveTextBackground,
  TEXT_BACKGROUND_DEFAULT_OPACITY,
} from '@/lib/modern-text-background';

describe('modern text background', () => {
  it('normalizes legacy rgba background color into base color and opacity', () => {
    const normalized = normalizeTextBackgroundColor('rgba(0, 0, 0, 0.35)', undefined);

    expect(normalized.color).toBe('#000000');
    expect(normalized.opacity).toBe(0.35);
    expect(normalized.cssColor).toBe('rgba(0, 0, 0, 0.35)');
  });

  it('uses the default opacity when background is active without alpha', () => {
    const normalized = createTextBackgroundData('#ff4b1f');

    expect(normalized).toEqual({
      backgroundColor: '#ff4b1f',
      backgroundOpacity: TEXT_BACKGROUND_DEFAULT_OPACITY,
    });
  });

  it('clears opacity when background is disabled', () => {
    expect(createTextBackgroundData(undefined)).toEqual({
      backgroundColor: undefined,
      backgroundOpacity: undefined,
    });
  });

  it('resolves css color from text data background opacity', () => {
    const resolved = resolveTextBackground({
      text: 'Caption',
      fontFamily: 'Inter',
      fontSize: 48,
      fontWeight: 'bold',
      fontStyle: 'normal',
      color: '#ffffff',
      backgroundColor: '#000000',
      backgroundOpacity: 0.6,
      textAlign: 'center',
      animation: 'none',
    });

    expect(resolved.color).toBe('#000000');
    expect(resolved.opacity).toBe(0.6);
    expect(resolved.cssColor).toBe('#00000099');
  });
});
