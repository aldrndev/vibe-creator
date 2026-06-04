import { describe, expect, it } from 'vitest';
import { redis, redisOptions } from './redis';

describe('redis client configuration', () => {
  it('does not connect eagerly during Vitest runs', () => {
    expect(redisOptions.lazyConnect).toBe(true);
    expect(redis.status).toBe('wait');
  });
});
