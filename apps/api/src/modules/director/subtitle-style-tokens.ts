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

export function mapSubtitleFontToken(fontToken?: string): string {
  switch (fontToken) {
    case 'F_INTER':
      return 'Inter';
    case 'F_GROTESK':
      return 'Manrope';
    case 'F_MEME':
      return 'Bebas Neue';
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
