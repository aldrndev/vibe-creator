import { describe, expect, it } from 'vitest';
import {
  COMMON_SUBTITLE_TARGET_LANGUAGE_OPTIONS,
  formatTranscribeLanguageLabel,
  isAutoTranscribeLanguage,
  isTranscribeLanguage,
  normalizeTranscribeLanguage,
} from '@/lib/transcribe-language';

describe('transcribe-language helpers', () => {
  it('supports auto aliases', () => {
    expect(isTranscribeLanguage('mixed')).toBe(true);
    expect(isTranscribeLanguage('auto')).toBe(true);
    expect(isAutoTranscribeLanguage('mixed')).toBe(true);
    expect(isAutoTranscribeLanguage('auto')).toBe(true);
    expect(normalizeTranscribeLanguage('auto')).toBe('mixed');
  });

  it('supports generic language codes', () => {
    expect(isTranscribeLanguage('fr')).toBe(true);
    expect(isTranscribeLanguage('pt-BR')).toBe(true);
    expect(normalizeTranscribeLanguage('pt-BR')).toBe('pt-br');
    expect(formatTranscribeLanguageLabel('pt-BR')).toBe('PT-BR');
  });

  it('falls back to auto mode for invalid input', () => {
    expect(isTranscribeLanguage('@@')).toBe(false);
    expect(normalizeTranscribeLanguage('@@')).toBe('mixed');
    expect(formatTranscribeLanguageLabel('@@')).toBe('Auto (Deteksi Otomatis)');
  });

  it('provides curated subtitle target options with valid language codes', () => {
    expect(COMMON_SUBTITLE_TARGET_LANGUAGE_OPTIONS.length).toBeGreaterThan(8);
    expect(COMMON_SUBTITLE_TARGET_LANGUAGE_OPTIONS.some((option) => option.value === 'en')).toBe(
      true,
    );
    expect(COMMON_SUBTITLE_TARGET_LANGUAGE_OPTIONS.some((option) => option.value === 'id')).toBe(
      true,
    );

    const values = COMMON_SUBTITLE_TARGET_LANGUAGE_OPTIONS.map((option) => option.value);
    const uniqueValues = new Set(values);
    expect(uniqueValues.size).toBe(values.length);
    expect(values.every((value) => isTranscribeLanguage(value))).toBe(true);

    const labels = COMMON_SUBTITLE_TARGET_LANGUAGE_OPTIONS.map((option) => option.label);
    expect(labels.every((label) => !label.includes('('))).toBe(true);
    expect(labels.every((label) => !label.includes(')'))).toBe(true);
  });
});
