import { describe, expect, it } from 'vitest';
import {
  getHistoryWorkspaceDisplayTitle,
  getWorkspaceContinuePath,
  getWorkspaceDisplayTitle,
  getWorkspaceEditedLabel,
  getWorkspaceExpiryLabel,
  getWorkspaceExportDownloadPath,
  getWorkspaceThumbnailPath,
  type WorkspaceItem,
} from './workspace-api';

function createWorkspaceItem(overrides: Partial<WorkspaceItem> = {}): WorkspaceItem {
  return {
    id: 'workspace-1',
    kind: 'video-studio',
    tool: 'video-studio',
    title: 'Draft',
    status: 'DRAFT',
    lifecycleStatus: 'ACTIVE',
    updatedAt: '2026-05-11T00:00:00.000Z',
    createdAt: '2026-05-11T00:00:00.000Z',
    expiresAt: '2026-05-18T00:00:00.000Z',
    completedAt: null,
    lastOpenedAt: null,
    ...overrides,
  };
}

describe('workspace-api helpers', () => {
  it('builds continue paths for tool sessions', () => {
    expect(getWorkspaceContinuePath(createWorkspaceItem())).toBe(
      '/tools/video-studio?session=workspace-1',
    );
    expect(
      getWorkspaceContinuePath(
        createWorkspaceItem({ id: 'director-1', kind: 'ai-director', tool: 'ai-director' }),
      ),
    ).toBe('/tools/ai-director?session=director-1');
    expect(
      getWorkspaceContinuePath(
        createWorkspaceItem({ id: 'loop-1', kind: 'loop-creator', tool: 'loop-creator' }),
      ),
    ).toBe('/tools/loop-creator?session=loop-1');
  });

  it('builds protected thumbnail paths for projects and exports', () => {
    expect(getWorkspaceThumbnailPath(createWorkspaceItem())).toBe(
      '/api/v1/workspaces/video-studio/workspace-1/thumbnail',
    );
    expect(
      getWorkspaceThumbnailPath(
        createWorkspaceItem({ id: 'export-1', kind: 'export', tool: 'exports' }),
      ),
    ).toBe('/api/v1/workspaces/export/export-1/thumbnail');
  });

  it('formats active and expired lifecycle labels', () => {
    const now = new Date('2026-05-11T00:00:00.000Z');
    expect(getWorkspaceExpiryLabel(createWorkspaceItem(), now)).toBe('7 hari tersisa');
    expect(getWorkspaceExpiryLabel(createWorkspaceItem({ expiresAt: null }), now)).toBe(
      '7 hari tersisa',
    );
    expect(getWorkspaceExpiryLabel(createWorkspaceItem({ lifecycleStatus: 'EXPIRED' }), now)).toBe(
      'Berakhir',
    );
    expect(
      getWorkspaceExpiryLabel(createWorkspaceItem({ lifecycleStatus: 'DOWNLOAD_EXPIRED' }), now),
    ).toBe('Download berakhir');
  });

  it('prioritizes download expiry for export items', () => {
    const now = new Date('2026-05-11T00:00:00.000Z');
    expect(
      getWorkspaceExpiryLabel(
        createWorkspaceItem({
          kind: 'export',
          tool: 'exports',
          lifecycleStatus: 'COMPLETED',
          downloadExpiresAt: '2026-05-12T12:00:00.000Z',
        }),
        now,
      ),
    ).toBe('36h tersisa');
  });

  it('replaces technical session titles with a friendly active-session title', () => {
    expect(
      getWorkspaceDisplayTitle(
        createWorkspaceItem({
          id: '7c0b5a04-61ec-45f1-b78b-cb7278fa5d0e',
          title: '7c0b5a04 61ec 45f1 b78b cb7278fa5d0e',
        }),
      ),
    ).toBe('Sesi Aktif Terakhir');
    expect(
      getWorkspaceDisplayTitle(
        createWorkspaceItem({
          id: 'director-1',
          kind: 'ai-director',
          tool: 'ai-director',
          title: 'AI Director b077bdce-d48d-46c1-a183-ad8c12345678',
        }),
      ),
    ).toBe('Sesi Aktif Terakhir');
    expect(getWorkspaceDisplayTitle(createWorkspaceItem({ title: 'Campaign Reel' }))).toBe(
      'Campaign Reel',
    );
  });

  it('formats the last edited label without exposing raw timestamps', () => {
    expect(
      getWorkspaceEditedLabel(
        createWorkspaceItem({
          updatedAt: '2026-05-14T16:24:00.000Z',
        }),
      ),
    ).toBe('Diedit 14 Mei, 23:24');
  });

  it('provides friendly history titles while preserving session modal title behavior', () => {
    const technicalProject = createWorkspaceItem({
      id: '7c0b5a04-61ec-45f1-b78b-cb7278fa5d0e',
      title: '7c0b5a04 61ec 45f1 b78b cb7278fa5d0e',
    });
    const exportItem = createWorkspaceItem({
      id: 'export-1',
      kind: 'export',
      tool: 'exports',
      sourceKind: 'video-studio',
      title: 'Campaign Reel export',
      lifecycleStatus: 'COMPLETED',
    });

    expect(getHistoryWorkspaceDisplayTitle(technicalProject)).toBe('Draft Video Studio');
    expect(getWorkspaceDisplayTitle(technicalProject)).toBe('Sesi Aktif Terakhir');
    expect(getHistoryWorkspaceDisplayTitle(exportItem)).toBe('Export - Campaign Reel');
    expect(getHistoryWorkspaceDisplayTitle(exportItem, 'Hook Produk')).toBe('Export - Hook Produk');
    expect(
      getHistoryWorkspaceDisplayTitle(
        createWorkspaceItem({
          kind: 'loop-creator',
          tool: 'loop-creator',
          title: 'Ocean Waves Loop',
        }),
      ),
    ).toBe('Ocean Waves Loop');
  });

  it('builds download paths only for completed exports with a known origin', () => {
    const videoExport = createWorkspaceItem({
      id: 'export-1',
      kind: 'export',
      tool: 'exports',
      sourceId: 'project-1',
      sourceKind: 'video-studio',
      lifecycleStatus: 'COMPLETED',
    });
    const directorExport = createWorkspaceItem({
      id: 'export-2',
      kind: 'export',
      tool: 'exports',
      sourceId: 'session-1',
      sourceKind: 'ai-director',
      lifecycleStatus: 'COMPLETED',
    });
    const loopExport = createWorkspaceItem({
      id: 'export-3',
      kind: 'export',
      tool: 'exports',
      sourceId: 'loop-1',
      sourceKind: 'loop-creator',
      lifecycleStatus: 'COMPLETED',
    });

    expect(getWorkspaceExportDownloadPath(videoExport)).toBe('/api/v1/export/export-1/download');
    expect(getWorkspaceExportDownloadPath(directorExport)).toBe(
      '/api/v1/director/sessions/session-1/export/download',
    );
    expect(getWorkspaceExportDownloadPath(loopExport)).toBe('/api/v1/export/export-3/download');
    expect(getWorkspaceExportDownloadPath({ ...videoExport, sourceKind: undefined })).toBeNull();
    expect(
      getWorkspaceExportDownloadPath({ ...videoExport, lifecycleStatus: 'DOWNLOAD_EXPIRED' }),
    ).toBeNull();
  });
});
