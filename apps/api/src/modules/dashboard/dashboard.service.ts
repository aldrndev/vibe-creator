import {
  DirectorJobStatus,
  ExportStatus,
  LifecycleStatus,
  type SubscriptionTier,
  type UserRole,
} from '@prisma/client';
import {
  type DashboardLatestExport,
  type DashboardQuotaSummary,
  type DashboardRecentWorkspace,
  type DashboardSummaryResponse,
  type DashboardTool,
  dashboardSummaryResponseSchema,
} from '@vibe-creator/shared';
import { prisma } from '@/lib/prisma';
import { getExportLimitForTier, PRO_UNLIMITED_EXPORT_LIMIT } from '@/lib/subscription-limits';
import type { WorkspaceRecentItem } from '@/modules/workspace/workspace.service';
import { workspaceService } from '@/modules/workspace/workspace.service';

const RECENT_WORKSPACE_LIMIT = 5;
const RECENT_QUERY_LIMIT = 30;
const EXPIRING_SOON_LIMIT = 3;
const EXPIRING_SOON_WINDOW_MS = 48 * 60 * 60 * 1000;

interface DashboardSummaryInput {
  readonly userId: string;
  readonly userRole: UserRole;
}

interface SubscriptionSnapshot {
  readonly tier: SubscriptionTier;
  readonly exportsUsed: number;
  readonly exportsLimit: number;
}

function isoDate(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

function buildWorkspaceThumbnailUrl(kind: string, id: string): string {
  return `/api/v1/workspaces/${encodeURIComponent(kind)}/${encodeURIComponent(id)}/thumbnail`;
}

function getReadableTitle(title: string): string {
  const cleaned = title
    .replace(/\.[a-z0-9]{2,5}$/i, '')
    .replace(/\s+export$/i, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\d{10,14}\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  return cleaned || 'Untitled Project';
}

function getContinueUrl(item: WorkspaceRecentItem): string {
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

  return `/tools/live-stream?session=${item.id}`;
}

function getExportDownloadUrl(item: WorkspaceRecentItem): string | null {
  if (item.kind !== 'export' || item.lifecycleStatus !== LifecycleStatus.COMPLETED) {
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

function toDashboardTool(tool: WorkspaceRecentItem['tool']): DashboardTool | null {
  if (tool === 'exports') {
    return null;
  }

  return tool;
}

function toRecentWorkspace(item: WorkspaceRecentItem): DashboardRecentWorkspace | null {
  const tool = toDashboardTool(item.tool);
  if (!tool || item.kind === 'export') {
    return null;
  }

  return {
    id: item.id,
    tool,
    title: getReadableTitle(item.title),
    status: item.status,
    lifecycleStatus: item.lifecycleStatus,
    continueUrl: getContinueUrl(item),
    thumbnailUrl: buildWorkspaceThumbnailUrl(item.kind, item.id),
    updatedAt: item.updatedAt.toISOString(),
    expiresAt: isoDate(item.expiresAt),
  };
}

function toLatestExport(item: WorkspaceRecentItem): DashboardLatestExport | null {
  const downloadUrl = getExportDownloadUrl(item);
  if (!downloadUrl || !item.downloadExpiresAt) {
    return null;
  }

  const sourceTool = item.sourceKind;
  if (!sourceTool) {
    return null;
  }

  return {
    id: item.id,
    title: getReadableTitle(item.title),
    sourceTool,
    downloadUrl,
    thumbnailUrl: buildWorkspaceThumbnailUrl('export', item.id),
    completedAt: isoDate(item.completedAt),
    downloadExpiresAt: item.downloadExpiresAt.toISOString(),
  };
}

function resolveQuota(
  subscription: SubscriptionSnapshot | null,
  userRole: UserRole,
): DashboardQuotaSummary {
  const tier = userRole === 'ADMIN' ? 'ADMIN' : (subscription?.tier ?? 'FREE');
  const exportsUsed = subscription?.exportsUsed ?? 0;
  const exportsLimit =
    userRole === 'ADMIN'
      ? PRO_UNLIMITED_EXPORT_LIMIT
      : (subscription?.exportsLimit ?? getExportLimitForTier('FREE'));
  const isUnlimited = userRole === 'ADMIN' || exportsLimit >= PRO_UNLIMITED_EXPORT_LIMIT;
  const usagePercent = isUnlimited
    ? 0
    : Math.min((exportsUsed / Math.max(exportsLimit, 1)) * 100, 100);

  return {
    tier,
    exportsUsed,
    exportsLimit: isUnlimited ? null : exportsLimit,
    remaining: isUnlimited ? null : Math.max(exportsLimit - exportsUsed, 0),
    usagePercent,
    isUnlimited,
  };
}

function getExpiringSoon(
  items: readonly DashboardRecentWorkspace[],
  now: Date,
): DashboardRecentWorkspace[] {
  const latestAllowed = now.getTime() + EXPIRING_SOON_WINDOW_MS;

  return items
    .filter((item) => {
      if (!item.expiresAt) {
        return false;
      }

      const expiresAt = new Date(item.expiresAt).getTime();
      return expiresAt > now.getTime() && expiresAt <= latestAllowed;
    })
    .sort((left, right) => {
      const leftTime = left.expiresAt
        ? new Date(left.expiresAt).getTime()
        : Number.MAX_SAFE_INTEGER;
      const rightTime = right.expiresAt
        ? new Date(right.expiresAt).getTime()
        : Number.MAX_SAFE_INTEGER;
      return leftTime - rightTime;
    })
    .slice(0, EXPIRING_SOON_LIMIT);
}

export const dashboardService = {
  async getSummary(input: DashboardSummaryInput): Promise<DashboardSummaryResponse> {
    const now = new Date();

    const [
      subscription,
      activeProjects,
      prompts,
      genericExports,
      directorExports,
      activeGenericDownloads,
      activeDirectorDownloads,
      recentResult,
      exportResult,
    ] = await Promise.all([
      prisma.subscription.findUnique({
        where: { userId: input.userId },
        select: { tier: true, exportsUsed: true, exportsLimit: true },
      }),
      prisma.project.count({
        where: {
          userId: input.userId,
          deletedAt: null,
          lifecycleStatus: LifecycleStatus.ACTIVE,
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
      }),
      prisma.prompt.count({ where: { userId: input.userId } }),
      prisma.exportHistory.count({ where: { userId: input.userId } }),
      prisma.directorExportJob.count({
        where: { session: { userId: input.userId, deletedAt: null } },
      }),
      prisma.exportHistory.count({
        where: {
          userId: input.userId,
          status: ExportStatus.COMPLETED,
          urlExpiresAt: { gt: now },
        },
      }),
      prisma.directorExportJob.count({
        where: {
          status: DirectorJobStatus.COMPLETED,
          downloadExpiresAt: { gt: now },
          outputDeletedAt: null,
          session: { userId: input.userId, deletedAt: null },
        },
      }),
      workspaceService.listRecent(input.userId, {
        status: 'ACTIVE',
        limit: RECENT_QUERY_LIMIT,
      }),
      workspaceService.listRecent(input.userId, {
        tool: 'exports',
        limit: RECENT_QUERY_LIMIT,
      }),
    ]);

    const recentWorkspaces = recentResult.items
      .map(toRecentWorkspace)
      .filter((item): item is DashboardRecentWorkspace => Boolean(item))
      .slice(0, RECENT_WORKSPACE_LIMIT);

    const latestExport =
      exportResult.items.map(toLatestExport).find((item): item is DashboardLatestExport => {
        if (!item) {
          return false;
        }

        return new Date(item.downloadExpiresAt).getTime() > now.getTime();
      }) ?? null;

    return dashboardSummaryResponseSchema.parse({
      stats: {
        activeProjects,
        prompts,
        exports: genericExports + directorExports,
        downloads: activeGenericDownloads + activeDirectorDownloads,
      },
      quota: resolveQuota(subscription, input.userRole),
      recentWorkspaces,
      latestExport,
      expiringSoon: getExpiringSoon(recentWorkspaces, now),
    });
  },
};
