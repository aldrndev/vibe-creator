import { beforeEach, describe, expect, it, vi } from 'vitest';

const { directorRepoMock, cleanupDirectorAssetFileIfUnreferencedMock } = vi.hoisted(() => ({
  directorRepoMock: {
    createSession: vi.fn(),
    findSession: vi.fn(),
    deleteSession: vi.fn(),
  },
  cleanupDirectorAssetFileIfUnreferencedMock: vi.fn(),
}));

vi.mock('@/modules/director/director.repo', () => ({
  directorRepo: directorRepoMock,
}));

vi.mock('@/modules/director/asset-file-cleanup', () => ({
  cleanupDirectorAssetFileIfUnreferenced: cleanupDirectorAssetFileIfUnreferencedMock,
}));

vi.mock('@/modules/director/services/analysis-reuse.service', () => ({
  directorAnalysisReuseService: {
    getReusableCandidates: vi.fn(),
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

import { directorSessionService } from '@/modules/director/services/session.service';

describe('directorSessionService.deleteSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    directorRepoMock.deleteSession.mockResolvedValue(true);
    cleanupDirectorAssetFileIfUnreferencedMock.mockResolvedValue(true);
  });

  it('cleans up the asset file after deleting the owning session', async () => {
    directorRepoMock.findSession.mockResolvedValue({
      id: 'session-1',
      asset: {
        storageKey: 'uploads/director/asset-1.mp4',
      },
    });

    await expect(directorSessionService.deleteSession('session-1', 'user-1')).resolves.toEqual({
      deleted: true,
    });

    expect(directorRepoMock.deleteSession).toHaveBeenCalledWith('session-1', 'user-1');
    expect(cleanupDirectorAssetFileIfUnreferencedMock).toHaveBeenCalledWith(
      'uploads/director/asset-1.mp4',
    );
  });

  it('does not cleanup storage when the session has no asset', async () => {
    directorRepoMock.findSession.mockResolvedValue({
      id: 'session-1',
      asset: null,
    });

    await directorSessionService.deleteSession('session-1', 'user-1');

    expect(cleanupDirectorAssetFileIfUnreferencedMock).not.toHaveBeenCalled();
  });
});
