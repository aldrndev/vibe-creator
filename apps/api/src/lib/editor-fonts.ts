import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DEFAULT_EDITOR_FONT_FAMILY,
  type EditorFontDefinition,
  getEditorFontByFamily,
  getEditorFontFile,
  resolveEditorFont,
} from '@vibe-creator/shared';

const moduleDir = dirname(fileURLToPath(import.meta.url));
const editorFontsDir = join(moduleDir, '..', 'assets', 'fonts', 'editor');

function getFallbackFont(): EditorFontDefinition {
  const fallbackFont = getEditorFontByFamily(DEFAULT_EDITOR_FONT_FAMILY);
  if (!fallbackFont) {
    throw new Error(`Default editor font is missing: ${DEFAULT_EDITOR_FONT_FAMILY}.`);
  }

  return fallbackFont;
}

export function getEditorFontsDir(): string {
  return editorFontsDir;
}

export function resolveEditorFontFile(fontFamily?: string | null, bold = false): string | null {
  const fontFile = getEditorFontFile(fontFamily, bold);
  const resolvedPath = join(editorFontsDir, fontFile);
  if (existsSync(resolvedPath)) {
    return resolvedPath;
  }

  const fallbackFont = getFallbackFont();
  const fallbackFile = bold ? fallbackFont.boldFile : fallbackFont.regularFile;
  const fallbackPath = join(editorFontsDir, fallbackFile);

  return existsSync(fallbackPath) ? fallbackPath : null;
}

export function resolveEditorFontExportFamily(fontFamily?: string | null): string {
  return resolveEditorFont(fontFamily).family;
}
