import { describe, expect, it } from 'vitest';
import { updateSubtitleStyleSchema } from '@/modules/director/routes/session.routes';

describe('updateSubtitleStyleSchema', () => {
  it('accepts top/center/bottom subtitle position values from editor', () => {
    const parsed = updateSubtitleStyleSchema.parse({
      position: 'bottom',
      animation: 'phrase',
      fontSize: 30,
    });

    expect(parsed.position).toBe('bottom');
    expect(parsed.animation).toBe('phrase');
    expect(parsed.fontSize).toBe(30);
  });

  it('rejects legacy subtitle positions', () => {
    expect(() =>
      updateSubtitleStyleSchema.parse({
        position: 'lower-third',
      }),
    ).toThrow();
  });

  it('accepts word-by-word subtitle animation', () => {
    const parsed = updateSubtitleStyleSchema.parse({
      animation: 'word',
    });

    expect(parsed.animation).toBe('word');
  });

  it('accepts viral pop word subtitle animation', () => {
    const parsed = updateSubtitleStyleSchema.parse({
      stylePreset: 'viral-pop',
      animation: 'pop-word',
    });

    expect(parsed.stylePreset).toBe('viral-pop');
    expect(parsed.animation).toBe('pop-word');
  });

  it('rejects invalid subtitle animation values', () => {
    expect(() =>
      updateSubtitleStyleSchema.parse({
        animation: 'spin-pop',
      }),
    ).toThrow();
  });
});
