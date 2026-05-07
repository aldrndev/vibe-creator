export const directorSubtitleTextColorTokenValues = [
  'C_WHITE',
  'C_BLACK',
  'C_YELLOW',
  'C_ORANGE',
  'C_GREEN',
  'C_CYAN',
  'C_BLUE',
  'C_PINK',
] as const;

export type DirectorSubtitleTextColorToken = (typeof directorSubtitleTextColorTokenValues)[number];

export const directorSubtitleBackgroundColorTokenValues = [
  'BG_TRANSPARENT',
  'C_BLACK',
  'C_WHITE',
  'C_ORANGE',
  'C_GREEN',
  'C_CYAN',
  'C_BLUE',
  'C_PINK',
] as const;

export type DirectorSubtitleBackgroundColorToken =
  (typeof directorSubtitleBackgroundColorTokenValues)[number];

export interface DirectorSubtitleColorOption {
  readonly value: DirectorSubtitleTextColorToken;
  readonly label: string;
  readonly swatchClass: string;
}

export const directorSubtitleColorOptions = [
  { value: 'C_WHITE', label: 'Putih', swatchClass: 'bg-white border-border/70' },
  { value: 'C_GREEN', label: 'Hijau', swatchClass: 'bg-green-400 border-green-300' },
  { value: 'C_CYAN', label: 'Cyan', swatchClass: 'bg-cyan-300 border-cyan-200' },
  { value: 'C_BLUE', label: 'Biru', swatchClass: 'bg-blue-400 border-blue-300' },
  { value: 'C_YELLOW', label: 'Kuning', swatchClass: 'bg-yellow-300 border-yellow-200' },
  { value: 'C_ORANGE', label: 'Oranye', swatchClass: 'bg-orange-400 border-orange-300' },
  { value: 'C_PINK', label: 'Pink', swatchClass: 'bg-pink-400 border-pink-300' },
  { value: 'C_BLACK', label: 'Hitam', swatchClass: 'bg-zinc-900 border-zinc-700' },
] as const satisfies readonly DirectorSubtitleColorOption[];
