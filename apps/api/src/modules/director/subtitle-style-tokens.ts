import {
  EDITOR_FONT_CATALOG,
  type EditorFontFamily,
  resolveEditorFontFamily,
} from '@vibe-creator/shared';

export const subtitleFontTokenValues = [
  'F_INTER',
  'F_GROTESK',
  'F_MEME',
  'F_DISPLAY',
  'F_CONDENSED',
  'F_ROUNDED',
  'F_SERIF',
  'F_MONO',
] as const;

export type SubtitleFontToken = (typeof subtitleFontTokenValues)[number];

export const subtitleFontFamilyValues = EDITOR_FONT_CATALOG.map((font) => font.family) as [
  EditorFontFamily,
  ...EditorFontFamily[],
];

export const subtitleTextColorTokenValues = [
  'C_WHITE',
  'C_BLACK',
  'C_YELLOW',
  'C_ORANGE',
  'C_GREEN',
  'C_CYAN',
  'C_BLUE',
  'C_PINK',
] as const;

export type SubtitleTextColorToken = (typeof subtitleTextColorTokenValues)[number];

export const subtitleBackgroundColorTokenValues = [
  'BG_TRANSPARENT',
  'C_BLACK',
  'C_WHITE',
  'C_ORANGE',
  'C_GREEN',
  'C_CYAN',
  'C_BLUE',
  'C_PINK',
] as const;

export type SubtitleBackgroundColorToken = (typeof subtitleBackgroundColorTokenValues)[number];

export function mapSubtitleFontToken(fontToken?: string): EditorFontFamily {
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
    case 'F_MONO':
      return 'Sora';
    case 'F_SERIF':
      return 'Noto Sans';
    default:
      return 'Inter';
  }
}

export function resolveSubtitleFontFamily(
  fontFamily?: string | null,
  fontToken?: string | null,
): EditorFontFamily {
  if (fontFamily) {
    return resolveEditorFontFamily(fontFamily);
  }

  return mapSubtitleFontToken(fontToken ?? undefined);
}
