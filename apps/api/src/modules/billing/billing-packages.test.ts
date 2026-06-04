import { describe, expect, it } from 'vitest';
import { packagesResponseSchema, quotaResponseSchema } from './billing.schemas';
import { STREAM_PACKAGES } from './billing.service';

describe('stream topup packages', () => {
  it('matches the public packages response contract', () => {
    expect(() =>
      packagesResponseSchema.parse({
        success: true,
        data: STREAM_PACKAGES,
      }),
    ).not.toThrow();
  });

  it('accepts unlimited admin quota without numeric limits', () => {
    expect(() =>
      quotaResponseSchema.parse({
        success: true,
        data: {
          remaining: null,
          total: null,
          used: 0,
          isUnlimited: true,
          cycleEnd: null,
        },
      }),
    ).not.toThrow();
  });
});
