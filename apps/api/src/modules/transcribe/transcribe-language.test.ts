import { describe, expect, it } from 'vitest';
import {
  isAutoTranscribeLanguage,
  isTranscribeLanguage,
  normalizeTranscribeLanguage,
} from '@/modules/transcribe/transcribe-language';

describe('transcribe-language helpers', () => {
  it('accepts auto and mixed aliases', () => {
    expect(isTranscribeLanguage('mixed')).toBe(true);
    expect(isTranscribeLanguage('auto')).toBe(true);
    expect(isAutoTranscribeLanguage('mixed')).toBe(true);
    expect(isAutoTranscribeLanguage('auto')).toBe(true);
    expect(normalizeTranscribeLanguage('auto')).toBe('mixed');
  });

  it('accepts generic language codes', () => {
    expect(isTranscribeLanguage('es')).toBe(true);
    expect(isTranscribeLanguage('pt-BR')).toBe(true);
    expect(normalizeTranscribeLanguage('pt-BR')).toBe('pt-br');
  });

  it('falls back safely for invalid values', () => {
    expect(isTranscribeLanguage('')).toBe(false);
    expect(isTranscribeLanguage('123')).toBe(false);
    expect(normalizeTranscribeLanguage('123', 'en')).toBe('en');
  });
});
