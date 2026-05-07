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
  readonly value: DirectorSubtitleFontToken;
  readonly label: string;
  readonly previewFamily: string;
}

export const directorSubtitleFontOptions = [
  {
    value: 'F_INTER',
    label: 'Inter',
    previewFamily: 'Inter, "Plus Jakarta Sans", sans-serif',
  },
  {
    value: 'F_GROTESK',
    label: 'Manrope',
    previewFamily: 'Manrope, "Avenir Next", "Helvetica Neue", Arial, sans-serif',
  },
  {
    value: 'F_MEME',
    label: 'Cherry',
    previewFamily: '"Cherry Bomb One", Impact, "Arial Black", "Bebas Neue", sans-serif',
  },
  {
    value: 'F_DISPLAY',
    label: 'League',
    previewFamily: '"League Spartan", "Arial Black", sans-serif',
  },
  {
    value: 'F_CONDENSED',
    label: 'Condensed',
    previewFamily: '"Arial Narrow", "Roboto Condensed", sans-serif',
  },
  {
    value: 'F_ROUNDED',
    label: 'Comfortaa',
    previewFamily: 'Comfortaa, "Arial Rounded MT Bold", Nunito, sans-serif',
  },
  {
    value: 'F_SERIF',
    label: 'Serif',
    previewFamily: 'Georgia, "Times New Roman", serif',
  },
  {
    value: 'F_MONO',
    label: 'Mono',
    previewFamily: '"IBM Plex Mono", "Courier New", monospace',
  },
] as const satisfies readonly DirectorSubtitleFontOption[];

export function mapDirectorSubtitlePreviewFont(fontToken: string): string {
  return (
    directorSubtitleFontOptions.find((fontOption) => fontOption.value === fontToken)
      ?.previewFamily ?? directorSubtitleFontOptions[0].previewFamily
  );
}
