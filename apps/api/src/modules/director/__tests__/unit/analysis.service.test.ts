import { DirectorJobStatus } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { directorRepoMock, directorQueueMock, directorProcessorMock, reuseServiceMock } = vi.hoisted(
  () => ({
    directorRepoMock: {
      findSession: vi.fn(),
      createAnalysisJob: vi.fn(),
      upsertAnalysisJobBySession: vi.fn(),
      replaceAnalysisCandidates: vi.fn(),
      updateAnalysisJob: vi.fn(),
      updateStep: vi.fn(),
      deleteSelectedClips: vi.fn(),
      createSelectedClips: vi.fn(),
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
    directorRepoMock.replaceAnalysisCandidates.mockResolvedValue([
      {
        id: 'candidate-materialized-1',
      },
    ]);
  });

  it('reuses cached analysis candidates without enqueueing a new job', async () => {
    const result = await directorAnalysisService.startAnalysis('session-1', 'user-1');

    expect(reuseServiceMock.getReusableCandidates).toHaveBeenCalledWith(
      expect.objectContaining({ contentHash: 'hash-1' }),
      'auto',
    );
    expect(directorQueueMock.add).not.toHaveBeenCalled();
    expect(directorRepoMock.updateStep).toHaveBeenCalledWith('session-1', 'user-1', 'PICKING');
    expect(directorRepoMock.upsertAnalysisJobBySession).toHaveBeenCalledTimes(1);
    expect(directorRepoMock.replaceAnalysisCandidates).toHaveBeenCalledTimes(1);
    expect(directorRepoMock.createAnalysisJob).not.toHaveBeenCalled();
    expect(result).toEqual({
      id: 'analysis-job-1',
      status: DirectorJobStatus.COMPLETED,
    });
  });

  it('ignores stale reusable candidates above hard short cap and enqueues a fresh job', async () => {
    reuseServiceMock.getReusableCandidates.mockResolvedValueOnce([
      {
        id: 'candidate-too-long',
        startMs: 0,
        endMs: 125000,
        tags: ['highlight'],
        score: 0.85,
        rank: 1,
        previewStorageKey: null,
        videoPreviewStorageKey: null,
      },
    ]);
    directorRepoMock.upsertAnalysisJobBySession.mockResolvedValueOnce({
      id: 'analysis-job-pending',
      status: DirectorJobStatus.PENDING,
    });

    const result = await directorAnalysisService.startAnalysis('session-1', 'user-1');

    expect(directorQueueMock.add).toHaveBeenCalledTimes(1);
    expect(directorRepoMock.upsertAnalysisJobBySession).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      id: 'analysis-job-pending',
      status: DirectorJobStatus.PENDING,
    });
  });

  it('re-runs analysis when existing completed job has incompatible duration config', async () => {
    directorRepoMock.findSession.mockResolvedValueOnce({
      id: 'session-1',
      userId: 'user-1',
      asset: {
        id: 'asset-1',
        storageKey: 'uploads/director/file.mp4',
        ingestStatus: 'READY',
        contentHash: 'hash-1',
        sourceUrlNormalized: null,
      },
      analysisJob: {
        id: 'analysis-job-old',
        status: DirectorJobStatus.COMPLETED,
        config: {
          minClipDuration: 12000,
          maxClipDuration: 120000,
        },
      },
    });
    reuseServiceMock.getReusableCandidates.mockResolvedValueOnce(null);
    directorRepoMock.upsertAnalysisJobBySession.mockResolvedValueOnce({
      id: 'analysis-job-requeued',
      status: DirectorJobStatus.PENDING,
    });

    const result = await directorAnalysisService.startAnalysis('session-1', 'user-1');

    expect(directorQueueMock.add).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      id: 'analysis-job-requeued',
      status: DirectorJobStatus.PENDING,
    });
  });

  it('stores requested duration range in analysis config and enqueues a new job', async () => {
    reuseServiceMock.getReusableCandidates.mockResolvedValueOnce(null);
    directorRepoMock.upsertAnalysisJobBySession.mockResolvedValueOnce({
      id: 'analysis-job-target-range',
      status: DirectorJobStatus.PENDING,
    });

    const result = await directorAnalysisService.startAnalysis('session-1', 'user-1', {
      targetDurationRange: '90-120',
    });

    expect(reuseServiceMock.getReusableCandidates).toHaveBeenCalledWith(
      expect.objectContaining({ contentHash: 'hash-1' }),
      '90-120',
    );
    expect(directorRepoMock.upsertAnalysisJobBySession).toHaveBeenCalledWith(
      'session-1',
      expect.objectContaining({
        config: expect.objectContaining({
          targetDurationRange: '90-120',
          minClipDuration: 90000,
          maxClipDuration: 120000,
        }),
      }),
      expect.objectContaining({
        config: expect.objectContaining({
          targetDurationRange: '90-120',
          minClipDuration: 90000,
          maxClipDuration: 120000,
        }),
      }),
    );
    expect(directorQueueMock.add).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      id: 'analysis-job-target-range',
      status: DirectorJobStatus.PENDING,
    });
  });
});

describe('directorAnalysisService.selectClips', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    directorRepoMock.findSession.mockResolvedValue({
      id: 'session-1',
      userId: 'user-1',
      analysisJob: {
        id: 'analysis-job-1',
        status: DirectorJobStatus.COMPLETED,
        config: {
          minClipDuration: 15000,
          maxClipDuration: 60000,
        },
        candidates: [
          {
            id: 'candidate-1',
            startMs: 0,
            endMs: 42000,
            score: 0.91,
          },
          {
            id: 'candidate-2',
            startMs: 45000,
            endMs: 76000,
            score: 0.82,
          },
        ],
      },
      asset: null,
    });
    directorRepoMock.deleteSelectedClips.mockResolvedValue({ count: 0 });
    directorRepoMock.replaceAnalysisCandidates.mockResolvedValue([
      {
        id: 'candidate-db-1',
      },
    ]);
    directorRepoMock.createSelectedClips.mockResolvedValue([
      {
        id: 'selected-1',
        candidateId: 'candidate-1',
        orderIndex: 0,
      },
    ]);
  });

  it('rejects multi-clip selection and only allows one clip per short', async () => {
    await expect(
      directorAnalysisService.selectClips('session-1', 'user-1', ['candidate-1', 'candidate-2']),
    ).rejects.toThrow('Pilih tepat 1 klip untuk membuat 1 short');
  });

  it('accepts single clip selection', async () => {
    const result = await directorAnalysisService.selectClips('session-1', 'user-1', [
      'candidate-1',
    ]);

    expect(directorRepoMock.deleteSelectedClips).toHaveBeenCalledWith('session-1');
    expect(directorRepoMock.createSelectedClips).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(1);
  });

  it('rejects stale overlapping candidates even when requested directly', async () => {
    directorRepoMock.findSession.mockResolvedValueOnce({
      id: 'session-1',
      userId: 'user-1',
      analysisJob: {
        id: 'analysis-job-1',
        status: DirectorJobStatus.COMPLETED,
        config: {
          minClipDuration: 15000,
          maxClipDuration: 60000,
        },
        candidates: [
          {
            id: 'candidate-1',
            startMs: 0,
            endMs: 42000,
            score: 0.91,
            rank: 1,
          },
          {
            id: 'candidate-overlap',
            startMs: 41950,
            endMs: 72000,
            score: 0.89,
            rank: 2,
          },
        ],
      },
      asset: null,
    });

    await expect(
      directorAnalysisService.selectClips('session-1', 'user-1', ['candidate-overlap']),
    ).rejects.toThrow('Invalid candidate IDs: candidate-overlap');
  });

  it('materializes reusable candidates before selection when analysis candidates are empty', async () => {
    directorRepoMock.findSession.mockResolvedValueOnce({
      id: 'session-1',
      userId: 'user-1',
      analysisJob: {
        id: 'analysis-job-1',
        status: DirectorJobStatus.COMPLETED,
        config: {
          minClipDuration: 15000,
          maxClipDuration: 60000,
        },
        candidates: [],
      },
      asset: {
        id: 'asset-1',
        storageKey: 'uploads/director/file.mp4',
        ingestStatus: 'READY',
        contentHash: 'hash-1',
        sourceUrlNormalized: null,
      },
    });
    reuseServiceMock.getReusableCandidates.mockResolvedValueOnce([
      {
        id: 'reuse-candidate-1',
        startMs: 0,
        endMs: 42000,
        tags: ['highlight'],
        score: 0.9,
        rank: 1,
        previewStorageKey: null,
        videoPreviewStorageKey: null,
        metadata: {},
      },
    ]);
    directorRepoMock.replaceAnalysisCandidates.mockResolvedValueOnce([
      {
        id: 'candidate-db-1',
      },
    ]);

    await directorAnalysisService.selectClips('session-1', 'user-1', ['reuse-candidate-1']);

    expect(directorRepoMock.replaceAnalysisCandidates).toHaveBeenCalledWith(
      'analysis-job-1',
      expect.any(Array),
    );
    expect(directorRepoMock.createSelectedClips).toHaveBeenCalledWith([
      expect.objectContaining({
        sessionId: 'session-1',
        candidateId: 'candidate-db-1',
      }),
    ]);
  });
});
