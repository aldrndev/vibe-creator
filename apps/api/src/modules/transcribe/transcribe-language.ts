const TRANSCRIBE_LANGUAGE_PATTERN = /^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/i;
const AUTO_LANGUAGE_ALIASES = new Set(['mixed', 'auto']);

export type TranscribeLanguage = string;

export const DEFAULT_TRANSCRIBE_LANGUAGE: TranscribeLanguage = 'mixed';

function normalizeRawLanguage(value: string | undefined | null): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

export function isTranscribeLanguage(
  value: string | undefined | null,
): value is TranscribeLanguage {
  const normalized = normalizeRawLanguage(value);
  if (!normalized) {
    return false;
  }

  return AUTO_LANGUAGE_ALIASES.has(normalized) || TRANSCRIBE_LANGUAGE_PATTERN.test(normalized);
}

export function isAutoTranscribeLanguage(value: string | undefined | null): boolean {
  const normalized = normalizeRawLanguage(value);
  if (!normalized) {
    return false;
  }

  return AUTO_LANGUAGE_ALIASES.has(normalized);
}

export function normalizeTranscribeLanguage(
  value: string | undefined | null,
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
