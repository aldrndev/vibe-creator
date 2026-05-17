import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  EDITOR_FONT_CATALOG,
  EDITOR_FONT_CATEGORY_VALUES,
  EDITOR_FONT_COUNT,
  resolveEditorFontFamily,
  validateEditorFontCatalog,
} from '@vibe-creator/shared';
import { describe, expect, it } from 'vitest';

const testDir = dirname(fileURLToPath(import.meta.url));
const webFontDir = join(testDir, '../../public/fonts/editor');

describe('editor Google font catalog', () => {
  it('ships the complete Video Studio and AI Director font pack', () => {
    expect(validateEditorFontCatalog()).toEqual([]);
    expect(EDITOR_FONT_CATALOG).toHaveLength(EDITOR_FONT_COUNT);
    expect(EDITOR_FONT_CATEGORY_VALUES).toHaveLength(5);
  });

  it('contains every self-hosted preview font file', () => {
    for (const font of EDITOR_FONT_CATALOG) {
      expect(existsSync(join(webFontDir, font.regularFile))).toBe(true);
      expect(existsSync(join(webFontDir, font.boldFile))).toBe(true);
    }
  });

  it('normalizes legacy and unknown editor fonts', () => {
    expect(resolveEditorFontFamily('Arial')).toBe('Inter');
    expect(resolveEditorFontFamily('Impact')).toBe('Anton');
    expect(resolveEditorFontFamily('Unknown Font')).toBe('Inter');
  });
});
