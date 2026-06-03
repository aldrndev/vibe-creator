import { beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  directorExportJob: {
    deleteMany: vi.fn(),
    findMany: vi.fn(),
  },
  exportHistory: {
    deleteMany: vi.fn(),
    findMany: vi.fn(),
  },
}));

vi.mock('@/lib/prisma', () => ({
  prisma: prismaMock,
}));

import { workspaceService } from './workspace.service';

describe('workspaceService.listRecent exports', () => {
  beforeEach(() => {
    prismaMock.directorExportJob.deleteMany.mockResolvedValue({ count: 0 });
    prismaMock.directorExportJob.findMany.mockResolvedValue([]);
    prismaMock.exportHistory.deleteMany.mockResolvedValue({ count: 0 });
    prismaMock.exportHistory.findMany.mockResolvedValue([]);
  });

  it('returns download-expired exports in the expired history filter with their source kind', async () => {
    prismaMock.exportHistory.findMany.mockResolvedValue([
      {
        id: 'export-1',
        projectId: 'project-1',
        status: 'COMPLETED',
        createdAt: new Date('2026-05-16T00:00:00.000Z'),
        completedAt: new Date('2026-05-16T00:10:00.000Z'),
        expiresAt: new Date('2026-05-18T00:10:00.000Z'),
        urlExpiresAt: new Date('2026-05-18T00:10:00.000Z'),
        project: { title: 'Campaign Reel' },
      },
    ]);

    const result = await workspaceService.listRecent('user-1', {
      tool: 'exports',
      status: 'EXPIRED',
      limit: 10,
    });

    expect(result.items).toEqual([
      expect.objectContaining({
        id: 'export-1',
        lifecycleStatus: 'DOWNLOAD_EXPIRED',
        sourceId: 'project-1',
        sourceKind: 'video-studio',
      }),
    ]);
  });

  it('marks AI Director export results so clients select the correct download route', async () => {
    prismaMock.directorExportJob.findMany.mockResolvedValue([
      {
        id: 'director-export-1',
        sessionId: 'session-1',
        status: 'COMPLETED',
        completedAt: new Date('2030-05-16T00:10:00.000Z'),
        downloadExpiresAt: new Date('2030-05-18T00:10:00.000Z'),
        outputDeletedAt: null,
        session: {
          id: 'session-1',
          updatedAt: new Date('2030-05-16T00:00:00.000Z'),
          expiresAt: new Date('2030-05-23T00:00:00.000Z'),
          lastOpenedAt: null,
          asset: null,
        },
      },
    ]);

    const result = await workspaceService.listRecent('user-1', {
      tool: 'exports',
      limit: 10,
    });

    expect(result.items[0]).toEqual(
      expect.objectContaining({
        sourceId: 'session-1',
        sourceKind: 'ai-director',
      }),
    );
  });

  it('deletes standalone export history items for the owner', async () => {
    prismaMock.exportHistory.deleteMany.mockResolvedValue({ count: 1 });

    await expect(
      workspaceService.softDeleteWorkspace('user-1', 'export', 'export-1'),
    ).resolves.toBe(true);

    expect(prismaMock.exportHistory.deleteMany).toHaveBeenCalledWith({
      where: {
        id: 'export-1',
        userId: 'user-1',
        OR: [{ urlExpiresAt: { lte: expect.any(Date) } }, { expiresAt: { lte: expect.any(Date) } }],
      },
    });
    expect(prismaMock.directorExportJob.deleteMany).toHaveBeenCalledWith({
      where: {
        id: 'export-1',
        session: { userId: 'user-1' },
        OR: [{ downloadExpiresAt: { lte: expect.any(Date) } }, { outputDeletedAt: { not: null } }],
      },
    });
  });
});
