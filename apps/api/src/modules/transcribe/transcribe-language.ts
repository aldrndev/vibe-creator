export const TRANSCRIBE_LANGUAGE_VALUES = ['id', 'en', 'mixed'] as const;

export type TranscribeLanguage = (typeof TRANSCRIBE_LANGUAGE_VALUES)[number];

export const DEFAULT_TRANSCRIBE_LANGUAGE: TranscribeLanguage = 'mixed';

export function isTranscribeLanguage(
  value: string | undefined | null,
): value is TranscribeLanguage {
  return value === 'id' || value === 'en' || value === 'mixed';
}
