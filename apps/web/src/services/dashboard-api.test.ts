import { describe, expect, it, vi } from 'vitest';

const apiMock = vi.hoisted(() => ({
  get: vi.fn(),
}));

vi.mock('@/services/api', () => ({
  api: apiMock,
}));

import { getDashboardSummary } from './dashboard-api';

describe('dashboard api', () => {
  it('parses dashboard summary responses with the shared schema', async () => {
    apiMock.get.mockResolvedValue({
      success: true,
      data: {
        stats: { activeProjects: 2, prompts: 1, exports: 3, downloads: 4 },
        quota: {
          tier: 'CREATOR',
          exportsUsed: 4,
          exportsLimit: 50,
          remaining: 46,
          usagePercent: 8,
          isUnlimited: false,
        },
        recentWorkspaces: [
          {
            id: 'workspace-1',
            tool: 'video-studio',
            title: 'Campaign Draft',
            status: 'DRAFT',
            lifecycleStatus: 'ACTIVE',
            continueUrl: '/tools/video-studio?session=workspace-1',
            thumbnailUrl: '/api/v1/workspaces/video-studio/workspace-1/thumbnail',
            updatedAt: '2026-06-01T00:00:00.000Z',
            expiresAt: '2026-06-08T00:00:00.000Z',
          },
        ],
        latestExport: null,
        expiringSoon: [],
      },
    });

    await expect(getDashboardSummary()).resolves.toMatchObject({
      stats: { activeProjects: 2 },
      recentWorkspaces: [{ continueUrl: '/tools/video-studio?session=workspace-1' }],
    });
  });

  it('rejects invalid dashboard response shapes', async () => {
    apiMock.get.mockResolvedValue({
      success: true,
      data: {
        stats: { activeProjects: -1, prompts: 0, exports: 0, downloads: 0 },
        quota: {},
        recentWorkspaces: [],
        latestExport: null,
        expiringSoon: [],
      },
    });

    await expect(getDashboardSummary()).rejects.toThrow();
  });
});
