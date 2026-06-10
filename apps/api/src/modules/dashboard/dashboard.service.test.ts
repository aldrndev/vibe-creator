import {
  DirectorJobStatus,
  ExportStatus,
  LifecycleStatus,
  ProjectStatus,
  UserRole,
} from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  directorExportJob: { count: vi.fn() },
  directorSession: { count: vi.fn() },
  downloadJob: { count: vi.fn() },
  exportHistory: { count: vi.fn() },
  project: { count: vi.fn() },
  prompt: { count: vi.fn() },
  subscription: { findUnique: vi.fn() },
}));

const workspaceServiceMock = vi.hoisted(() => ({
  listRecent: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: prismaMock,
}));

vi.mock('@/modules/workspace/workspace.service', () => ({
  workspaceService: workspaceServiceMock,
}));

import { dashboardService } from './dashboard.service';

function workspaceItem(overrides: Record<string, unknown> = {}) {
  return {
    id: 'project-1',
    kind: 'video-studio',
    tool: 'video-studio',
    title: 'Campaign Draft',
    status: ProjectStatus.DRAFT,
    lifecycleStatus: LifecycleStatus.ACTIVE,
    updatedAt: new Date('2035-06-01T10:00:00.000Z'),
    createdAt: new Date('2035-06-01T09:00:00.000Z'),
    expiresAt: new Date('2035-06-02T09:00:00.000Z'),
    completedAt: null,
    lastOpenedAt: null,
    ...overrides,
  };
}

describe('dashboardService.getSummary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.subscription.findUnique.mockResolvedValue({
      tier: 'CREATOR',
      exportsUsed: 12,
      exportsLimit: 50,
    });
    prismaMock.project.count.mockResolvedValue(2);
    prismaMock.directorSession.count.mockResolvedValue(0);
    prismaMock.prompt.count.mockResolvedValue(3);
    prismaMock.exportHistory.count.mockResolvedValueOnce(4).mockResolvedValueOnce(2);
    prismaMock.directorExportJob.count.mockResolvedValueOnce(1).mockResolvedValueOnce(1);
    prismaMock.downloadJob.count.mockResolvedValue(5);
    workspaceServiceMock.listRecent
      .mockResolvedValueOnce({
        items: [
          workspaceItem(),
          workspaceItem({ id: 'loop-1', kind: 'loop-creator', tool: 'loop-creator' }),
        ],
        nextCursor: null,
      })
      .mockResolvedValueOnce({
        items: [
          workspaceItem({
            id: 'export-1',
            kind: 'export',
            tool: 'exports',
            title: 'Campaign Draft export',
            lifecycleStatus: LifecycleStatus.COMPLETED,
            completedAt: new Date('2035-06-01T11:00:00.000Z'),
            downloadExpiresAt: new Date('2035-06-03T11:00:00.000Z'),
            sourceId: 'project-1',
            sourceKind: 'video-studio',
          }),
        ],
        nextCursor: null,
      });
  });

  it('returns typed dashboard summary for the owner', async () => {
    const summary = await dashboardService.getSummary({
      userId: 'user-1',
      userRole: UserRole.USER,
    });

    expect(summary.stats).toEqual({
      activeProjects: 2,
      prompts: 3,
      exports: 5,
      downloads: 3,
    });
    expect(summary.quota).toMatchObject({
      tier: 'CREATOR',
      exportsUsed: 12,
      exportsLimit: 50,
      remaining: 38,
      isUnlimited: false,
    });
    expect(summary.recentWorkspaces[0]).toMatchObject({
      id: 'project-1',
      title: 'Campaign Draft',
      continueUrl: '/tools/video-studio?session=project-1',
      thumbnailUrl: '/api/v1/workspaces/video-studio/project-1/thumbnail',
    });
    expect(summary.latestExport).toMatchObject({
      id: 'export-1',
      sourceTool: 'video-studio',
      downloadUrl: '/api/v1/export/export-1/download',
    });
    expect(prismaMock.exportHistory.count).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        status: ExportStatus.COMPLETED,
        urlExpiresAt: { gt: expect.any(Date) },
      },
    });
    expect(prismaMock.directorExportJob.count).toHaveBeenCalledWith({
      where: {
        status: DirectorJobStatus.COMPLETED,
        downloadExpiresAt: { gt: expect.any(Date) },
        outputDeletedAt: null,
        session: { userId: 'user-1', deletedAt: null },
      },
    });
    expect(prismaMock.project.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        userId: 'user-1',
        deletedAt: null,
        lifecycleStatus: LifecycleStatus.ACTIVE,
      }),
    });
    expect(prismaMock.directorSession.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        userId: 'user-1',
        deletedAt: null,
        lifecycleStatus: LifecycleStatus.ACTIVE,
      }),
    });
  });

  it('uses unlimited quota for admin users without a subscription', async () => {
    prismaMock.subscription.findUnique.mockResolvedValue(null);

    const summary = await dashboardService.getSummary({
      userId: 'admin-1',
      userRole: UserRole.ADMIN,
    });

    expect(summary.quota).toEqual({
      tier: 'ADMIN',
      exportsUsed: 0,
      exportsLimit: null,
      remaining: null,
      usagePercent: 0,
      isUnlimited: true,
    });
  });

  it('does not expose expired exports as latest download', async () => {
    workspaceServiceMock.listRecent
      .mockReset()
      .mockResolvedValueOnce({ items: [], nextCursor: null })
      .mockResolvedValueOnce({
        items: [
          workspaceItem({
            id: 'export-expired',
            kind: 'export',
            tool: 'exports',
            lifecycleStatus: 'DOWNLOAD_EXPIRED',
            downloadExpiresAt: new Date('2026-05-01T00:00:00.000Z'),
            sourceId: 'project-1',
            sourceKind: 'video-studio',
          }),
        ],
        nextCursor: null,
      });

    const summary = await dashboardService.getSummary({
      userId: 'user-1',
      userRole: UserRole.USER,
    });

    expect(summary.latestExport).toBeNull();
  });

  it('cleans technical filenames before returning dashboard items', async () => {
    workspaceServiceMock.listRecent
      .mockReset()
      .mockResolvedValueOnce({
        items: [
          workspaceItem({
            title: 'Campfire_burning_in_forest_202605240655 Reaction.mp4',
            kind: 'reaction-video',
            tool: 'reaction-video',
          }),
        ],
        nextCursor: null,
      })
      .mockResolvedValueOnce({
        items: [
          workspaceItem({
            id: 'export-technical',
            kind: 'export',
            tool: 'exports',
            title: 'Campfire_burning_in_forest_202605240655 export.mp4',
            lifecycleStatus: LifecycleStatus.COMPLETED,
            completedAt: new Date('2035-06-01T11:00:00.000Z'),
            downloadExpiresAt: new Date('2035-06-03T11:00:00.000Z'),
            sourceId: 'project-1',
            sourceKind: 'reaction-video',
          }),
        ],
        nextCursor: null,
      });

    const summary = await dashboardService.getSummary({
      userId: 'user-1',
      userRole: UserRole.USER,
    });

    expect(summary.recentWorkspaces[0]?.title).toBe('Campfire burning in forest Reaction');
    expect(summary.latestExport?.title).toBe('Campfire burning in forest');
  });
});
