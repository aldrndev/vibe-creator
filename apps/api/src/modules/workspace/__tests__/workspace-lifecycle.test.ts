import { describe, expect, it } from 'vitest';
import {
  assertDownloadAvailable,
  assertWorkspaceActive,
  DOWNLOAD_EXPIRED_CODE,
  getActiveDraftExpiresAt,
  getCompletedSessionExpiresAt,
  getExportDownloadExpiresAt,
  resolveWorkspaceExpiresAt,
  SESSION_EXPIRED_CODE,
  WorkspaceLifecycleError,
} from '../workspace-lifecycle';

describe('workspace lifecycle retention', () => {
  const now = new Date('2026-05-11T00:00:00.000Z');

  it('sets active draft expiry to 7 days after activity', () => {
    expect(getActiveDraftExpiresAt(now).toISOString()).toBe('2026-05-18T00:00:00.000Z');
  });

  it('sets completed session expiry to 72 hours after completion', () => {
    expect(getCompletedSessionExpiresAt(now).toISOString()).toBe('2026-05-14T00:00:00.000Z');
  });

  it('sets export download expiry to 48 hours after export completion', () => {
    expect(getExportDownloadExpiresAt(now).toISOString()).toBe('2026-05-13T00:00:00.000Z');
  });

  it('resolves legacy active sessions without stored expiry from last update time', () => {
    expect(
      resolveWorkspaceExpiresAt({
        lifecycleStatus: 'ACTIVE',
        expiresAt: null,
        updatedAt: now,
      })?.toISOString(),
    ).toBe('2026-05-18T00:00:00.000Z');
  });

  it('rejects expired or deleted workspaces with a stable error code', () => {
    expect(() => assertWorkspaceActive('EXPIRED', new Date('2026-05-12T00:00:00.000Z'))).toThrow(
      WorkspaceLifecycleError,
    );

    try {
      assertWorkspaceActive('ACTIVE', new Date('2026-05-10T23:59:59.000Z'));
    } catch (error) {
      expect(error).toBeInstanceOf(WorkspaceLifecycleError);
      expect((error as WorkspaceLifecycleError).code).toBe(SESSION_EXPIRED_CODE);
    }
  });

  it('rejects expired download output with a stable error code', () => {
    try {
      assertDownloadAvailable(new Date('2026-05-10T00:00:00.000Z'), null, now);
    } catch (error) {
      expect(error).toBeInstanceOf(WorkspaceLifecycleError);
      expect((error as WorkspaceLifecycleError).code).toBe(DOWNLOAD_EXPIRED_CODE);
    }
  });
});
