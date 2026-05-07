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

export function mapSubtitleFontToken(fontToken?: string): string {
  switch (fontToken) {
    case 'F_INTER':
      return 'Inter';
    case 'F_GROTESK':
      return 'Manrope';
    case 'F_MEME':
      return 'Cherry Bomb One';
    case 'F_DISPLAY':
      return 'League Spartan';
    case 'F_CONDENSED':
      return 'Liberation Sans Narrow';
    case 'F_ROUNDED':
      return 'Comfortaa';
    case 'F_MONO':
      return 'Liberation Mono';
    case 'F_SERIF':
      return 'Liberation Serif';
    default:
      return 'Inter';
  }
}
