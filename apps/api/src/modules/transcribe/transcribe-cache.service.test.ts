import { describe, expect, it, vi } from 'vitest';

const { envMock, redisMock } = vi.hoisted(() => ({
  envMock: {
    WHISPER_MODEL_SIZE: 'small',
    TRANSCRIBE_PROVIDER: 'auto',
    TRANSCRIBE_SERVICE_URL: 'http://localhost:8765',
  },
  redisMock: {
    status: 'ready',
    get: vi.fn(),
    set: vi.fn(),
  },
}));

vi.mock('@/config/env', () => ({
  env: envMock,
}));

vi.mock('@/lib/redis', () => ({
  redis: redisMock,
}));

import { transcribeCacheService } from '@/modules/transcribe/transcribe-cache.service';

describe('transcribeCacheService', () => {
  it('builds a stable cache key for the same clip fingerprint', () => {
    const firstKey = transcribeCacheService.buildFingerprint({
      assetFingerprint: 'asset-hash',
      startMs: 0,
      endMs: 35_000,
      trimStartMs: 0,
      trimEndMs: 0,
      language: 'id',
    });
    const secondKey = transcribeCacheService.buildFingerprint({
      assetFingerprint: 'asset-hash',
      startMs: 0,
      endMs: 35_000,
      trimStartMs: 0,
      trimEndMs: 0,
      language: 'id',
    });

    expect(firstKey).toBe(secondKey);
  });

  it('builds different cache keys for different target languages', () => {
    const indonesiaKey = transcribeCacheService.buildFingerprint({
      assetFingerprint: 'asset-hash',
      startMs: 0,
      endMs: 35_000,
      trimStartMs: 0,
      trimEndMs: 0,
      language: 'id',
    });
    const englishKey = transcribeCacheService.buildFingerprint({
      assetFingerprint: 'asset-hash',
      startMs: 0,
      endMs: 35_000,
      trimStartMs: 0,
      trimEndMs: 0,
      language: 'en',
    });

    expect(indonesiaKey).not.toBe(englishKey);
  });
});
