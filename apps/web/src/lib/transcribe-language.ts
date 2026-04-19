const TRANSCRIBE_LANGUAGE_PATTERN = /^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/i;
const AUTO_LANGUAGE_ALIASES = new Set(['mixed', 'auto']);
const LANGUAGE_LABELS: Record<string, string> = {
  id: 'Indonesia',
  en: 'English',
};

export interface SubtitleTargetLanguageOption {
  value: string;
  label: string;
}

export const COMMON_SUBTITLE_TARGET_LANGUAGE_OPTIONS: readonly SubtitleTargetLanguageOption[] = [
  { value: 'id', label: 'Indonesia' },
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'pt-br', label: 'Portuguese Brazil' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'it', label: 'Italian' },
  { value: 'tr', label: 'Turkish' },
  { value: 'ru', label: 'Russian' },
  { value: 'ar', label: 'Arabic' },
  { value: 'hi', label: 'Hindi' },
  { value: 'ja', label: 'Japanese' },
  { value: 'ko', label: 'Korean' },
  { value: 'zh-cn', label: 'Chinese Simplified' },
  { value: 'zh-tw', label: 'Chinese Traditional' },
  { value: 'vi', label: 'Vietnamese' },
  { value: 'th', label: 'Thai' },
] as const;

export type TranscribeLanguage = string;

export const DEFAULT_TRANSCRIBE_LANGUAGE: TranscribeLanguage = 'mixed';

function normalizeRawLanguage(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

export function isTranscribeLanguage(value: unknown): value is TranscribeLanguage {
  const normalized = normalizeRawLanguage(value);
  if (!normalized) {
    return false;
  }

  return AUTO_LANGUAGE_ALIASES.has(normalized) || TRANSCRIBE_LANGUAGE_PATTERN.test(normalized);
}

export function isAutoTranscribeLanguage(value: unknown): boolean {
  const normalized = normalizeRawLanguage(value);
  if (!normalized) {
    return false;
  }

  return AUTO_LANGUAGE_ALIASES.has(normalized);
}

export function normalizeTranscribeLanguage(
  value: unknown,
  fallback: TranscribeLanguage = DEFAULT_TRANSCRIBE_LANGUAGE,
): TranscribeLanguage {
  const normalized = normalizeRawLanguage(value);
  if (normalized && isTranscribeLanguage(normalized)) {
    return AUTO_LANGUAGE_ALIASES.has(normalized) ? DEFAULT_TRANSCRIBE_LANGUAGE : normalized;
  }

  const normalizedFallback = normalizeRawLanguage(fallback);
  if (normalizedFallback && isTranscribeLanguage(normalizedFallback)) {
    return AUTO_LANGUAGE_ALIASES.has(normalizedFallback)
      ? DEFAULT_TRANSCRIBE_LANGUAGE
      : normalizedFallback;
  }

  return DEFAULT_TRANSCRIBE_LANGUAGE;
}

export function formatTranscribeLanguageLabel(value: unknown): string {
  const normalizedLanguage = normalizeTranscribeLanguage(value);

  if (normalizedLanguage === DEFAULT_TRANSCRIBE_LANGUAGE) {
    return 'Auto (Deteksi Otomatis)';
  }

  return LANGUAGE_LABELS[normalizedLanguage] ?? normalizedLanguage.toUpperCase();
}
