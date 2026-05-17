import { describe, expect, it } from 'vitest';
import {
  getWorkspaceContinuePath,
  getWorkspaceDisplayTitle,
  getWorkspaceEditedLabel,
  getWorkspaceExpiryLabel,
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
  });

  it('formats active and expired lifecycle labels', () => {
    const now = new Date('2026-05-11T00:00:00.000Z');
    expect(getWorkspaceExpiryLabel(createWorkspaceItem(), now)).toBe('7 hari tersisa');
    expect(getWorkspaceExpiryLabel(createWorkspaceItem({ expiresAt: null }), now)).toBe(
      '7 hari tersisa',
    );
    expect(getWorkspaceExpiryLabel(createWorkspaceItem({ lifecycleStatus: 'EXPIRED' }), now)).toBe(
      'Expired',
    );
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
});
