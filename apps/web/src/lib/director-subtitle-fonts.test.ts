import { EDITOR_FONT_CATALOG } from '@vibe-creator/shared';
import { describe, expect, it } from 'vitest';
import {
  directorSubtitleFontOptions,
  mapDirectorSubtitlePreviewFont,
  resolveDirectorSubtitleFontFamily,
} from '@/lib/director-subtitle-fonts';

describe('director subtitle font options', () => {
  it('uses the same Google font pack as Video Studio', () => {
    expect(directorSubtitleFontOptions).toHaveLength(EDITOR_FONT_CATALOG.length);
    expect(directorSubtitleFontOptions.map((font) => font.value)).toContain('Bangers');
    expect(directorSubtitleFontOptions.map((font) => font.value)).toContain('League Spartan');
  });

  it('keeps legacy token fallback while prioritizing explicit font family', () => {
    expect(resolveDirectorSubtitleFontFamily(undefined, 'F_MEME')).toBe('Bangers');
    expect(resolveDirectorSubtitleFontFamily('Sora', 'F_MEME')).toBe('Sora');
    expect(mapDirectorSubtitlePreviewFont('Sora', 'F_MEME')).toContain('Sora');
  });
});
