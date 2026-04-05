import { DirectorJobStatus } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { directorRepoMock, directorQueueMock, directorProcessorMock, reuseServiceMock } = vi.hoisted(
  () => ({
    directorRepoMock: {
      findSession: vi.fn(),
      createAnalysisJob: vi.fn(),
      upsertAnalysisJobBySession: vi.fn(),
      updateAnalysisJob: vi.fn(),
      updateStep: vi.fn(),
    },
    directorQueueMock: {
      add: vi.fn(),
    },
    directorProcessorMock: {
      getVideoMetadata: vi.fn(),
    },
    reuseServiceMock: {
      getReusableCandidates: vi.fn(),
    },
  }),
);

vi.mock('@/modules/director/director.repo', () => ({
  directorRepo: directorRepoMock,
}));

vi.mock('@/modules/director/director.queue', async () => {
  return {
    directorQueue: directorQueueMock,
    buildDirectorQueueJobId: vi.fn(() => 'director-analyze-session-1'),
  };
});

vi.mock('@/modules/director/director.processor', () => ({
  directorProcessor: directorProcessorMock,
}));

vi.mock('@/modules/director/services/analysis-reuse.service', () => ({
  directorAnalysisReuseService: reuseServiceMock,
}));

vi.mock('@/config/env', () => ({
  env: {
    MEDIA_INPUT_DIR: '/tmp/uploads',
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import { directorAnalysisService } from '@/modules/director/services/analysis.service';

describe('directorAnalysisService.startAnalysis', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    directorRepoMock.findSession.mockResolvedValue({
      id: 'session-1',
      userId: 'user-1',
      asset: {
        id: 'asset-1',
        storageKey: 'uploads/director/file.mp4',
        ingestStatus: 'READY',
        contentHash: 'hash-1',
        sourceUrlNormalized: null,
      },
      analysisJob: null,
    });
    directorProcessorMock.getVideoMetadata.mockResolvedValue({
      duration: 600,
    });
    reuseServiceMock.getReusableCandidates.mockResolvedValue([
      {
        id: 'candidate-1',
        startMs: 0,
        endMs: 10000,
        tags: ['highlight'],
        score: 0.9,
        rank: 1,
        previewStorageKey: null,
        videoPreviewStorageKey: null,
      },
    ]);
    directorRepoMock.createAnalysisJob.mockResolvedValue({
      id: 'analysis-job-legacy',
      status: DirectorJobStatus.COMPLETED,
    });
    directorRepoMock.upsertAnalysisJobBySession.mockResolvedValue({
      id: 'analysis-job-1',
      status: DirectorJobStatus.COMPLETED,
    });
    directorRepoMock.updateAnalysisJob.mockResolvedValue({
      id: 'analysis-job-1',
      status: DirectorJobStatus.COMPLETED,
    });
  });

  it('reuses cached analysis candidates without enqueueing a new job', async () => {
    const result = await directorAnalysisService.startAnalysis('session-1', 'user-1');

    expect(reuseServiceMock.getReusableCandidates).toHaveBeenCalled();
    expect(directorQueueMock.add).not.toHaveBeenCalled();
    expect(directorRepoMock.updateStep).toHaveBeenCalledWith('session-1', 'user-1', 'PICKING');
    expect(directorRepoMock.upsertAnalysisJobBySession).toHaveBeenCalledTimes(1);
    expect(directorRepoMock.createAnalysisJob).not.toHaveBeenCalled();
    expect(result).toEqual({
      id: 'analysis-job-1',
      status: DirectorJobStatus.COMPLETED,
    });
  });
});
