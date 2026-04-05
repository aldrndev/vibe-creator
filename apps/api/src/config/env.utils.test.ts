import { describe, expect, it } from 'vitest';
import {
  emptyStringToUndefined,
  optionalNonEmptyStringSchema,
  optionalUrlSchema,
} from './env.utils';

describe('env.utils', () => {
  it('converts blank strings to undefined', () => {
    expect(emptyStringToUndefined('')).toBeUndefined();
    expect(emptyStringToUndefined('   ')).toBeUndefined();
    expect(emptyStringToUndefined('value')).toBe('value');
  });

  it('accepts empty optional secrets as undefined', () => {
    expect(optionalNonEmptyStringSchema.parse('')).toBeUndefined();
    expect(optionalNonEmptyStringSchema.parse('secret-value')).toBe('secret-value');
  });

  it('accepts empty optional URLs as undefined', () => {
    expect(optionalUrlSchema.parse('')).toBeUndefined();
    expect(optionalUrlSchema.parse('http://localhost:11434/api')).toBe(
      'http://localhost:11434/api',
    );
  });
});
