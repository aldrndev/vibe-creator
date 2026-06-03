import { z } from 'zod';
import { api } from '@/services/api';

const workspaceKindSchema = z.enum([
  'ai-director',
  'video-studio',
  'loop-creator',
  'reaction-video',
  'live-stream',
  'export',
]);
const workspaceToolSchema = z.enum([
  'ai-director',
  'video-studio',
  'loop-creator',
  'reaction-video',
  'live-stream',
  'exports',
]);
const lifecycleStatusSchema = z.enum([
  'ACTIVE',
  'COMPLETED',
  'EXPIRED',
  'DELETED',
  'DOWNLOAD_EXPIRED',
]);

export const workspaceItemSchema = z.object({
  id: z.string(),
  kind: workspaceKindSchema,
  tool: workspaceToolSchema,
  title: z.string(),
  status: z.string(),
  lifecycleStatus: lifecycleStatusSchema,
  updatedAt: z.string(),
  createdAt: z.string(),
  expiresAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  lastOpenedAt: z.string().nullable(),
  downloadExpiresAt: z.string().nullable().optional(),
  sourceId: z.string().nullable().optional(),
  sourceKind: z
    .enum(['ai-director', 'video-studio', 'loop-creator', 'reaction-video', 'live-stream'])
    .nullable()
    .optional(),
});

const recentWorkspaceResponseSchema = z.object({
  items: z.array(workspaceItemSchema),
  nextCursor: z.string().nullable(),
});

const workspaceMonthLabels = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des',
] as const;
const UUID_HEX_LENGTH = 32;
const MINIMUM_TECHNICAL_TITLE_LENGTH = 12;
const HOUR_MS = 60 * 60 * 1000;
const ACTIVE_WORKSPACE_RETENTION_MS = 7 * 24 * HOUR_MS;
const COMPLETED_WORKSPACE_RETENTION_MS = 72 * HOUR_MS;
const UUID_TITLE_PATTERN =
  /[0-9a-f]{8}[-\s]?[0-9a-f]{4}[-\s]?[0-9a-f]{4}[-\s]?[0-9a-f]{4}[-\s]?[0-9a-f]{12}/i;

export type WorkspaceItem = z.infer<typeof workspaceItemSchema>;
export type WorkspaceTool = z.infer<typeof workspaceToolSchema>;

export async function getLastActiveWorkspace(
  tool: Exclude<WorkspaceTool, 'exports'>,
): Promise<WorkspaceItem | null> {
  const response = await api.get<unknown>(`/workspaces/last-active?tool=${tool}`);
  if (!response.success) {
    throw new Error(response.error.message || 'Gagal memuat session terakhir.');
  }

  if (!response.data) {
    return null;
  }

  return workspaceItemSchema.parse(response.data);
}

export async function listRecentWorkspaces(params: {
  tool?: WorkspaceTool;
  status?: 'ACTIVE' | 'COMPLETED' | 'EXPIRED' | 'DELETED';
  limit?: number;
  cursor?: string;
}): Promise<{ items: WorkspaceItem[]; nextCursor: string | null }> {
  const query = new URLSearchParams();
  if (params.tool) query.set('tool', params.tool);
  if (params.status) query.set('status', params.status);
  if (params.limit) query.set('limit', String(params.limit));
  if (params.cursor) query.set('cursor', params.cursor);

  const response = await api.get<unknown>(`/workspaces/recent?${query.toString()}`);
  if (!response.success) {
    throw new Error(response.error.message || 'Gagal memuat riwayat.');
  }

  return recentWorkspaceResponseSchema.parse(response.data);
}

export async function duplicateWorkspace(item: WorkspaceItem): Promise<unknown> {
  if (item.kind === 'export') {
    throw new Error('Export tidak bisa diduplicate.');
  }

  const response = await api.post<unknown>(`/workspaces/${item.kind}/${item.id}/duplicate`);
  if (!response.success) {
    throw new Error(response.error.message || 'Gagal duplicate workspace.');
  }
  return response.data;
}

export async function deleteWorkspace(item: WorkspaceItem): Promise<void> {
  const response = await api.delete<unknown>(`/workspaces/${item.kind}/${item.id}`);
  if (!response.success) {
    throw new Error(response.error.message || 'Gagal hapus workspace.');
  }
}

export function getWorkspaceContinuePath(item: WorkspaceItem): string {
  if (item.kind === 'ai-director') {
    return `/tools/ai-director?session=${item.id}`;
  }

  if (item.kind === 'video-studio') {
    return `/tools/video-studio?session=${item.id}`;
  }

  if (item.kind === 'loop-creator') {
    return `/tools/loop-creator?session=${item.id}`;
  }

  if (item.kind === 'reaction-video') {
    return `/tools/reaction?session=${item.id}`;
  }

  if (item.kind === 'live-stream') {
    return `/tools/live-stream?session=${item.id}`;
  }

  return item.sourceId ? `/tools/ai-director?session=${item.sourceId}` : '/dashboard/history';
}

/** Builds the protected thumbnail endpoint for one history item. */
export function getWorkspaceThumbnailPath(item: WorkspaceItem): string {
  return `/api/v1/workspaces/${encodeURIComponent(item.kind)}/${encodeURIComponent(item.id)}/thumbnail`;
}

function normalizeTechnicalTitle(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function isTechnicalWorkspaceTitle(title: string, id: string): boolean {
  if (UUID_TITLE_PATTERN.test(title)) {
    return true;
  }

  const normalizedTitle = normalizeTechnicalTitle(title);
  if (normalizedTitle.length < MINIMUM_TECHNICAL_TITLE_LENGTH) {
    return false;
  }

  if (normalizedTitle === normalizeTechnicalTitle(id)) {
    return true;
  }

  return normalizedTitle.length === UUID_HEX_LENGTH && /^[0-9a-f]+$/.test(normalizedTitle);
}

function getFallbackExpiryTarget(item: WorkspaceItem): string | null {
  const updatedAt = new Date(item.updatedAt);
  if (Number.isNaN(updatedAt.getTime())) {
    return null;
  }

  if (item.lifecycleStatus === 'ACTIVE') {
    return new Date(updatedAt.getTime() + ACTIVE_WORKSPACE_RETENTION_MS).toISOString();
  }

  if (item.lifecycleStatus === 'COMPLETED') {
    const completedAt = item.completedAt ? new Date(item.completedAt) : updatedAt;
    const baseDate = Number.isNaN(completedAt.getTime()) ? updatedAt : completedAt;
    return new Date(baseDate.getTime() + COMPLETED_WORKSPACE_RETENTION_MS).toISOString();
  }

  return null;
}

export function getWorkspaceDisplayTitle(item: WorkspaceItem): string {
  const title = item.title.trim();
  if (title && !isTechnicalWorkspaceTitle(title, item.id)) {
    return title;
  }

  return 'Sesi Aktif Terakhir';
}

export function getWorkspaceEditedLabel(item: WorkspaceItem): string {
  const editedAt = new Date(item.updatedAt);
  if (Number.isNaN(editedAt.getTime())) {
    return 'Diedit baru saja';
  }

  const day = editedAt.getDate();
  const month = workspaceMonthLabels[editedAt.getMonth()] ?? workspaceMonthLabels[0];
  const hours = String(editedAt.getHours()).padStart(2, '0');
  const minutes = String(editedAt.getMinutes()).padStart(2, '0');

  return `Diedit ${day} ${month}, ${hours}:${minutes}`;
}

export function getWorkspaceExpiryLabel(item: WorkspaceItem, now = new Date()): string {
  if (item.lifecycleStatus === 'EXPIRED') {
    return 'Berakhir';
  }

  if (item.lifecycleStatus === 'DOWNLOAD_EXPIRED') {
    return 'Download berakhir';
  }

  const target = item.downloadExpiresAt ?? item.expiresAt ?? getFallbackExpiryTarget(item);
  if (!target) {
    return 'Tanpa batas waktu';
  }

  const diffMs = new Date(target).getTime() - now.getTime();
  if (diffMs <= 0) {
    return 'Berakhir';
  }

  const hours = Math.ceil(diffMs / (60 * 60 * 1000));
  if (hours < 48) {
    return `${hours}h tersisa`;
  }

  return `${Math.ceil(hours / 24)} hari tersisa`;
}

export function getHistoryWorkspaceDisplayTitle(item: WorkspaceItem, sourceTitle?: string): string {
  const title = item.title.trim();
  const hasReadableTitle = title.length > 0 && !isTechnicalWorkspaceTitle(title, item.id);

  if (item.kind === 'export') {
    if (sourceTitle) {
      return `Export - ${sourceTitle}`;
    }

    if (hasReadableTitle) {
      const sourceName = title.replace(/\s+export$/i, '');
      return `Export - ${sourceName}`;
    }

    return 'Hasil Export';
  }

  if (hasReadableTitle) {
    return title;
  }

  if (item.kind === 'video-studio') return 'Draft Video Studio';
  if (item.kind === 'loop-creator') return 'Draft Loop Creator';
  if (item.kind === 'reaction-video') return 'Draft Reaction Creator';
  return 'Sesi AI Director';
}

export function getWorkspaceExportDownloadPath(item: WorkspaceItem): string | null {
  if (item.kind !== 'export' || item.lifecycleStatus !== 'COMPLETED') {
    return null;
  }

  if (
    item.sourceKind === 'video-studio' ||
    item.sourceKind === 'loop-creator' ||
    item.sourceKind === 'reaction-video'
  ) {
    return `/api/v1/export/${item.id}/download`;
  }

  if (item.sourceKind === 'ai-director' && item.sourceId) {
    return `/api/v1/director/sessions/${item.sourceId}/export/download`;
  }

  return null;
}
