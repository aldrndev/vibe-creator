import {
  EDITOR_FONT_CATALOG,
  type EditorFontCategory,
  type EditorFontFamily,
  getEditorFontCssFamily,
  resolveEditorFontFamily,
} from '@vibe-creator/shared';

export const directorSubtitleFontTokenValues = [
  'F_INTER',
  'F_GROTESK',
  'F_MEME',
  'F_DISPLAY',
  'F_CONDENSED',
  'F_ROUNDED',
  'F_SERIF',
  'F_MONO',
] as const;

export type DirectorSubtitleFontToken = (typeof directorSubtitleFontTokenValues)[number];

export interface DirectorSubtitleFontOption {
  readonly value: EditorFontFamily;
  readonly label: string;
  readonly category: EditorFontCategory;
  readonly previewFamily: string;
}

export const directorSubtitleFontOptions = EDITOR_FONT_CATALOG.map((font) => ({
  value: font.family as EditorFontFamily,
  label: font.label,
  category: font.category,
  previewFamily: getEditorFontCssFamily(font.family),
})) satisfies readonly DirectorSubtitleFontOption[];

export function mapDirectorSubtitleTokenToFamily(fontToken?: string | null): EditorFontFamily {
  switch (fontToken) {
    case 'F_INTER':
      return 'Inter';
    case 'F_GROTESK':
      return 'Manrope';
    case 'F_MEME':
      return 'Bangers';
    case 'F_DISPLAY':
      return 'League Spartan';
    case 'F_CONDENSED':
      return 'Roboto Condensed';
    case 'F_ROUNDED':
      return 'Fredoka';
    case 'F_SERIF':
      return 'Noto Sans';
    case 'F_MONO':
      return 'Sora';
    default:
      return 'Inter';
  }
}

export function resolveDirectorSubtitleFontFamily(
  fontFamily?: string | null,
  fontToken?: string | null,
): EditorFontFamily {
  if (fontFamily) {
    return resolveEditorFontFamily(fontFamily);
  }

  return mapDirectorSubtitleTokenToFamily(fontToken);
}

export function mapDirectorSubtitlePreviewFont(
  fontFamily?: string | null,
  fontToken?: string | null,
): string {
  return getEditorFontCssFamily(resolveDirectorSubtitleFontFamily(fontFamily, fontToken));
}
