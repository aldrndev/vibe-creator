import { describe, expect, it } from 'vitest';
import { updateSubtitleStyleSchema } from '@/modules/director/routes/session.routes';

describe('updateSubtitleStyleSchema', () => {
  it('accepts extended subtitle position and animation values from editor', () => {
    const parsed = updateSubtitleStyleSchema.parse({
      position: 'lower-third',
      animation: 'phrase',
      fontSize: 30,
    });

    expect(parsed.position).toBe('lower-third');
    expect(parsed.animation).toBe('phrase');
    expect(parsed.fontSize).toBe(30);
  });

  it('accepts word-by-word subtitle animation', () => {
    const parsed = updateSubtitleStyleSchema.parse({
      animation: 'word',
    });

    expect(parsed.animation).toBe('word');
  });
});
