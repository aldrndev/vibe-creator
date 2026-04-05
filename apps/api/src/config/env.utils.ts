import { z } from 'zod';

/**
 * Normalize blank env strings to `undefined` so optional secrets/URLs
 * can be left empty in local Docker env files without crashing startup.
 */
export function emptyStringToUndefined(value: unknown) {
  if (typeof value === 'string' && value.trim() === '') {
    return undefined;
  }

  return value;
}

/**
 * Optional secret-like env var that should be non-empty when provided.
 */
export const optionalNonEmptyStringSchema = z.preprocess(
  emptyStringToUndefined,
  z.string().min(1).optional(),
);

/**
 * Optional URL env var that may be intentionally left blank.
 */
export const optionalUrlSchema = z.preprocess(emptyStringToUndefined, z.url().optional());
