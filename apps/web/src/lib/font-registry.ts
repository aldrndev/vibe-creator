import {
  EDITOR_FONT_CATALOG,
  type EditorFontDefinition,
  getEditorFontByFamily,
  getEditorFontById,
} from '@vibe-creator/shared';
import { registerEditorFontFaces } from '@/lib/editor-font-loader';

export type FontDefinition = EditorFontDefinition & {
  readonly source: 'local';
  readonly ffmpegPath: string;
};

export const FONT_REGISTRY: readonly FontDefinition[] = EDITOR_FONT_CATALOG.map((font) => ({
  ...font,
  source: 'local',
  ffmpegPath: `/fonts/editor/${font.regularFile}`,
}));

export async function loadGoogleFont(_familyName: string): Promise<void> {
  registerEditorFontFaces();
}

export function getFontWeights(familyName: string): readonly number[] {
  return getEditorFontByFamily(familyName)?.availableWeights ?? [400];
}

export function getFontById(id: string): FontDefinition | undefined {
  const font = getEditorFontById(id);
  return FONT_REGISTRY.find((registeredFont) => registeredFont.id === font?.id);
}

export function getFontByFamily(family: string): FontDefinition | undefined {
  const font = getEditorFontByFamily(family);
  return FONT_REGISTRY.find((registeredFont) => registeredFont.id === font?.id);
}

export async function preloadFontsForOverlays(fontFamilies: string[]): Promise<void> {
  if (fontFamilies.length > 0) {
    registerEditorFontFaces();
  }
}

export function isFontLoaded(familyName: string): boolean {
  return typeof document !== 'undefined' && document.fonts.check(`16px "${familyName}"`);
}

export async function waitForFont(familyName: string, timeoutMs = 5000): Promise<boolean> {
  if (isFontLoaded(familyName)) {
    return true;
  }

  registerEditorFontFaces();

  return new Promise((resolve) => {
    const startTime = Date.now();

    const check = () => {
      if (isFontLoaded(familyName)) {
        resolve(true);
        return;
      }

      if (Date.now() - startTime > timeoutMs) {
        resolve(false);
        return;
      }

      requestAnimationFrame(check);
    };

    check();
  });
}
