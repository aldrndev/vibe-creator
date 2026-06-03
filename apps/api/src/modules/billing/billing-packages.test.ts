import { describe, expect, it } from 'vitest';
import { packagesResponseSchema } from './billing.schemas';
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
});
