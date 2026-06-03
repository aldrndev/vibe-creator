import { beforeEach, describe, expect, it, vi } from 'vitest';

const { cleanupProjectAssetFilesMock, prismaMock } = vi.hoisted(() => ({
  cleanupProjectAssetFilesMock: vi.fn(),
  prismaMock: {
    project: {
      delete: vi.fn(),
      findMany: vi.fn(),
    },
    directorSession: {
      delete: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

vi.mock('@/config/env', () => ({
  env: { MEDIA_INPUT_DIR: '/tmp/cleanup-cron-tests' },
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock('@/lib/prisma', () => ({
  prisma: prismaMock,
}));

vi.mock('@/modules/director/asset-file-cleanup', () => ({
  cleanupDirectorAssetFileIfUnreferenced: vi.fn(),
}));

vi.mock('@/modules/project/project-asset-file-cleanup', () => ({
  cleanupProjectAssetFiles: cleanupProjectAssetFilesMock,
}));

import { cleanupCron } from './cleanup.cron';

describe('cleanupCron.hardDeleteExpiredWorkspaces', () => {
  beforeEach(() => {
    prismaMock.project.findMany.mockResolvedValue([{ id: 'project-1' }]);
    prismaMock.directorSession.findMany.mockResolvedValue([]);
    cleanupProjectAssetFilesMock.mockResolvedValue({
      succeeded: true,
      deletedFiles: 2,
      freedBytes: 2048,
    });
  });

  it('cleans physical project assets before hard-deleting an expired project record', async () => {
    await cleanupCron.hardDeleteExpiredWorkspaces();

    expect(cleanupProjectAssetFilesMock).toHaveBeenCalledWith('project-1');
    expect(prismaMock.project.delete).toHaveBeenCalledWith({ where: { id: 'project-1' } });
    expect(cleanupProjectAssetFilesMock.mock.invocationCallOrder[0]).toBeLessThan(
      prismaMock.project.delete.mock.invocationCallOrder[0] ?? Number.POSITIVE_INFINITY,
    );
  });

  it('keeps the project record for a retry when physical asset cleanup fails', async () => {
    cleanupProjectAssetFilesMock.mockResolvedValue({
      succeeded: false,
      deletedFiles: 0,
      freedBytes: 0,
    });

    await cleanupCron.hardDeleteExpiredWorkspaces();

    expect(prismaMock.project.delete).not.toHaveBeenCalled();
  });
});
