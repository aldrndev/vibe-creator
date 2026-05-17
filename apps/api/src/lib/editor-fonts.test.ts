import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { EDITOR_FONT_CATALOG } from '@vibe-creator/shared';
import { describe, expect, it } from 'vitest';
import {
  getEditorFontsDir,
  resolveEditorFontExportFamily,
  resolveEditorFontFile,
} from '@/lib/editor-fonts';

describe('editor font export assets', () => {
  it('ships every catalog font file for FFmpeg export', () => {
    const fontsDir = getEditorFontsDir();

    for (const font of EDITOR_FONT_CATALOG) {
      expect(existsSync(join(fontsDir, font.regularFile))).toBe(true);
      expect(existsSync(join(fontsDir, font.boldFile))).toBe(true);
    }
  });

  it('resolves legacy and unknown font families safely', () => {
    expect(resolveEditorFontExportFamily('Impact')).toBe('Anton');
    expect(resolveEditorFontExportFamily('Unknown Font')).toBe('Inter');
    expect(resolveEditorFontFile('Bangers', true)).toContain('bangers-bold.ttf');
  });
});
