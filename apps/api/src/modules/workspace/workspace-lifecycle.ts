import type { LifecycleStatus } from '@prisma/client';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export const WORKSPACE_RETENTION_MS = {
  tempUpload: DAY_MS,
  activeDraft: 7 * DAY_MS,
  completedSession: 72 * HOUR_MS,
  exportDownload: 48 * HOUR_MS,
  previewCache: DAY_MS,
  expiredGrace: 7 * DAY_MS,
} as const;

export const SESSION_EXPIRED_CODE = 'SESSION_EXPIRED';
export const ASSET_EXPIRED_CODE = 'ASSET_EXPIRED';
export const DOWNLOAD_EXPIRED_CODE = 'DOWNLOAD_EXPIRED';

export class WorkspaceLifecycleError extends Error {
  readonly code: string;
  readonly statusCode: number;

  constructor(code: string, message: string, statusCode = 410) {
    super(message);
    this.name = 'WorkspaceLifecycleError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

export function addRetention(date: Date, retentionMs: number): Date {
  return new Date(date.getTime() + retentionMs);
}

export function getActiveDraftExpiresAt(now = new Date()): Date {
  return addRetention(now, WORKSPACE_RETENTION_MS.activeDraft);
}

export function getCompletedSessionExpiresAt(now = new Date()): Date {
  return addRetention(now, WORKSPACE_RETENTION_MS.completedSession);
}

export function getExportDownloadExpiresAt(now = new Date()): Date {
  return addRetention(now, WORKSPACE_RETENTION_MS.exportDownload);
}

export function getExpiredHardDeleteBefore(now = new Date()): Date {
  return new Date(now.getTime() - WORKSPACE_RETENTION_MS.expiredGrace);
}

export function resolveWorkspaceExpiresAt(input: {
  readonly lifecycleStatus: LifecycleStatus;
  readonly expiresAt: Date | null | undefined;
  readonly updatedAt: Date;
  readonly completedAt?: Date | null | undefined;
}): Date | null {
  if (input.expiresAt) {
    return input.expiresAt;
  }

  if (input.lifecycleStatus === 'ACTIVE') {
    return getActiveDraftExpiresAt(input.updatedAt);
  }

  if (input.lifecycleStatus === 'COMPLETED') {
    return getCompletedSessionExpiresAt(input.completedAt ?? input.updatedAt);
  }

  return null;
}

export function isWorkspaceExpired(
  lifecycleStatus: LifecycleStatus,
  expiresAt: Date | null | undefined,
  now = new Date(),
): boolean {
  if (lifecycleStatus === 'DELETED' || lifecycleStatus === 'EXPIRED') {
    return true;
  }

  return Boolean(expiresAt && expiresAt.getTime() <= now.getTime());
}

export function assertWorkspaceActive(
  lifecycleStatus: LifecycleStatus,
  expiresAt: Date | null | undefined,
  message = 'Session sudah expired. Mulai baru atau duplicate dari riwayat jika masih tersedia.',
): void {
  if (isWorkspaceExpired(lifecycleStatus, expiresAt)) {
    throw new WorkspaceLifecycleError(SESSION_EXPIRED_CODE, message);
  }
}

export function assertDownloadAvailable(
  downloadExpiresAt: Date | null | undefined,
  outputDeletedAt: Date | null | undefined,
  now = new Date(),
): void {
  if (outputDeletedAt || (downloadExpiresAt && downloadExpiresAt.getTime() <= now.getTime())) {
    throw new WorkspaceLifecycleError(
      DOWNLOAD_EXPIRED_CODE,
      'Link download sudah expired. Export ulang jika source media masih tersedia.',
    );
  }
}
