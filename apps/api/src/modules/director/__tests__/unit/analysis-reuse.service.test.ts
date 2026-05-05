import { beforeEach, describe, expect, it, vi } from 'vitest';

const { directorRepoMock, redisMock } = vi.hoisted(() => ({
  directorRepoMock: {
    findLatestReusableAnalysisByAsset: vi.fn(),
  },
  redisMock: {
    status: 'ready',
    get: vi.fn(),
    set: vi.fn(),
  },
}));

vi.mock('@/lib/redis', () => ({
  redis: redisMock,
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    warn: vi.fn(),
  },
}));

vi.mock('@/modules/director/director.repo', () => ({
  directorRepo: directorRepoMock,
}));

import { directorAnalysisReuseService } from '@/modules/director/services/analysis-reuse.service';

describe('directorAnalysisReuseService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    redisMock.status = 'ready';
    redisMock.get.mockResolvedValue(null);
    redisMock.set.mockResolvedValue('OK');
  });

  it('keys reusable analysis cache by requested duration range', async () => {
    const asset = {
      contentHash: 'hash-1',
      sourceUrlNormalized: null,
      storageKey: 'director/file.mp4',
    };
    directorRepoMock.findLatestReusableAnalysisByAsset.mockResolvedValue({
      candidates: [
        {
          id: 'candidate-1',
          startMs: 0,
          endMs: 75_000,
          tags: ['highlight'],
          score: 0.9,
          rank: 1,
          previewStorageKey: null,
          videoPreviewStorageKey: null,
          metadata: {},
        },
      ],
    });

    const result = await directorAnalysisReuseService.getReusableCandidates(asset, '60-90');

    expect(redisMock.get).toHaveBeenCalledWith('director:analysis-cache:60-90:hash-1');
    expect(directorRepoMock.findLatestReusableAnalysisByAsset).toHaveBeenCalledWith(asset, '60-90');
    expect(redisMock.set).toHaveBeenCalledWith(
      'director:analysis-cache:60-90:hash-1',
      expect.any(String),
      'EX',
      expect.any(Number),
    );
    expect(result?.[0]?.id).toBe('candidate-1');
  });
});
