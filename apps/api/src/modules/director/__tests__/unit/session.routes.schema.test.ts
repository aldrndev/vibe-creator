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

  it('accepts meme pop subtitle preset and font token', () => {
    const parsed = updateSubtitleStyleSchema.parse({
      stylePreset: 'meme-pop',
      fontToken: 'F_MEME',
    });

    expect(parsed.stylePreset).toBe('meme-pop');
    expect(parsed.fontToken).toBe('F_MEME');
  });

  it('accepts podcast duo speaker color settings', () => {
    const parsed = updateSubtitleStyleSchema.parse({
      stylePreset: 'podcast-duo',
      speakerMode: 'speaker-colors',
      textColorToken: 'C_CYAN',
      bgColorToken: 'BG_TRANSPARENT',
      speakerStyles: [
        {
          speaker: 'Penanya',
          label: 'Penanya',
          textColorToken: 'C_CYAN',
          bgColorToken: 'BG_TRANSPARENT',
        },
        {
          speaker: 'Penjawab',
          label: 'Penjawab',
          textColorToken: 'C_YELLOW',
        },
      ],
    });

    expect(parsed.stylePreset).toBe('podcast-duo');
    expect(parsed.speakerMode).toBe('speaker-colors');
    expect(parsed.speakerStyles).toHaveLength(2);
  });

  it('accepts modern subtitle font tokens', () => {
    const parsed = updateSubtitleStyleSchema.parse({
      fontToken: 'F_DISPLAY',
    });

    expect(parsed.fontToken).toBe('F_DISPLAY');
  });

  it('accepts Google editor subtitle font families', () => {
    const parsed = updateSubtitleStyleSchema.parse({
      fontFamily: 'Bangers',
    });

    expect(parsed.fontFamily).toBe('Bangers');
  });

  it('rejects invalid subtitle font tokens', () => {
    expect(() =>
      updateSubtitleStyleSchema.parse({
        fontToken: 'F_COMIC',
      }),
    ).toThrow();
  });

  it('rejects unknown subtitle font families', () => {
    expect(() =>
      updateSubtitleStyleSchema.parse({
        fontFamily: 'Comic Sans',
      }),
    ).toThrow();
  });

  it('rejects invalid subtitle color tokens', () => {
    expect(() =>
      updateSubtitleStyleSchema.parse({
        textColorToken: 'C_RAINBOW',
      }),
    ).toThrow();
  });

  it('rejects invalid speaker style payloads', () => {
    expect(() =>
      updateSubtitleStyleSchema.parse({
        speakerMode: 'speaker-colors',
        speakerStyles: [
          {
            speaker: '',
            label: 'Penanya',
            textColorToken: 'C_CYAN',
          },
        ],
      }),
    ).toThrow();
  });

  it('rejects invalid subtitle animation values', () => {
    expect(() =>
      updateSubtitleStyleSchema.parse({
        animation: 'spin-pop',
      }),
    ).toThrow();
  });
});
