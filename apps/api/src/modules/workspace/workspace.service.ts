import { DirectorStep, LifecycleStatus, type Prisma, ProjectStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import type { RecentWorkspacesQuery, WorkspaceKind, WorkspaceTool } from './workspace.schemas';
import {
  assertWorkspaceActive,
  getActiveDraftExpiresAt,
  getCompletedSessionExpiresAt,
  isWorkspaceExpired,
  resolveWorkspaceExpiresAt,
} from './workspace-lifecycle';

const VIDEO_STUDIO_PROJECT_KIND = 'video-studio-modern-project';
const DEFAULT_RECENT_LIMIT = 20;

export interface WorkspaceRecentItem {
  readonly id: string;
  readonly kind: WorkspaceKind | 'export';
  readonly tool: WorkspaceTool;
  readonly title: string;
  readonly status: string;
  readonly lifecycleStatus: LifecycleStatus | 'DOWNLOAD_EXPIRED';
  readonly updatedAt: Date;
  readonly createdAt: Date;
  readonly expiresAt: Date | null;
  readonly completedAt: Date | null;
  readonly lastOpenedAt: Date | null;
  readonly downloadExpiresAt?: Date | null;
  readonly sourceId?: string | null;
}

function asJsonRecord(value: Prisma.JsonValue | null | undefined): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function toInputJson(value: Prisma.JsonValue | null): Prisma.InputJsonValue | undefined {
  if (value === null) {
    return undefined;
  }

  return value as Prisma.InputJsonValue;
}

function isVideoStudioProjectStoryData(value: Prisma.JsonValue | null | undefined): boolean {
  return asJsonRecord(value)?.kind === VIDEO_STUDIO_PROJECT_KIND;
}

function readNestedString(value: unknown, keys: readonly string[]): string | null {
  let current: unknown = value;
  for (const key of keys) {
    if (!current || typeof current !== 'object' || Array.isArray(current)) {
      return null;
    }
    current = (current as Record<string, unknown>)[key];
  }

  return typeof current === 'string' && current.trim().length > 0 ? current : null;
}

function getVideoStudioTitle(project: {
  title: string;
  storyData: Prisma.JsonValue | null;
}): string {
  return readNestedString(project.storyData, ['project', 'title']) ?? project.title;
}

function getDirectorTitle(session: {
  id: string;
  asset: { metadata: Prisma.JsonValue; storageKey: string } | null;
}): string {
  const metadataTitle = readNestedString(session.asset?.metadata, ['title']);
  if (metadataTitle) {
    return metadataTitle;
  }

  const storageName = session.asset?.storageKey.split('/').pop();
  return storageName ? `AI Director ${storageName}` : `AI Director ${session.id.slice(0, 8)}`;
}

function clampRecentLimit(limit: number | undefined): number {
  if (!limit) {
    return DEFAULT_RECENT_LIMIT;
  }

  return Math.min(Math.max(limit, 1), 50);
}

function cursorDate(cursor: string | undefined): Date | null {
  if (!cursor) {
    return null;
  }

  const date = new Date(cursor);
  return Number.isNaN(date.getTime()) ? null : date;
}

function itemMatchesStatus(
  item: Pick<WorkspaceRecentItem, 'lifecycleStatus'>,
  status: RecentWorkspacesQuery['status'],
): boolean {
  if (!status) {
    return true;
  }

  return item.lifecycleStatus === status;
}

function sortRecentItems(left: WorkspaceRecentItem, right: WorkspaceRecentItem): number {
  return right.updatedAt.getTime() - left.updatedAt.getTime() || right.id.localeCompare(left.id);
}

export const workspaceService = {
  async listRecent(userId: string, query: RecentWorkspacesQuery) {
    const limit = clampRecentLimit(query.limit);
    const cursor = cursorDate(query.cursor);
    const now = new Date();
    const take = limit * 3;
    const items: WorkspaceRecentItem[] = [];

    if (!query.tool || query.tool === 'video-studio') {
      const projects = await prisma.project.findMany({
        where: {
          userId,
          deletedAt: null,
          ...(cursor ? { updatedAt: { lt: cursor } } : {}),
        },
        orderBy: { updatedAt: 'desc' },
        take,
      });

      for (const project of projects) {
        if (!isVideoStudioProjectStoryData(project.storyData)) {
          continue;
        }

        const expiresAt = resolveWorkspaceExpiresAt(project);
        const lifecycleStatus = isWorkspaceExpired(project.lifecycleStatus, expiresAt, now)
          ? LifecycleStatus.EXPIRED
          : project.lifecycleStatus;

        const item: WorkspaceRecentItem = {
          id: project.id,
          kind: 'video-studio',
          tool: 'video-studio',
          title: getVideoStudioTitle(project),
          status: project.status,
          lifecycleStatus,
          updatedAt: project.updatedAt,
          createdAt: project.createdAt,
          expiresAt,
          completedAt: project.completedAt,
          lastOpenedAt: project.lastOpenedAt,
        };

        if (itemMatchesStatus(item, query.status)) {
          items.push(item);
        }
      }
    }

    if (!query.tool || query.tool === 'ai-director') {
      const sessions = await prisma.directorSession.findMany({
        where: {
          userId,
          deletedAt: null,
          ...(cursor ? { updatedAt: { lt: cursor } } : {}),
        },
        include: { asset: true },
        orderBy: { updatedAt: 'desc' },
        take,
      });

      for (const session of sessions) {
        const expiresAt = resolveWorkspaceExpiresAt(session);
        const lifecycleStatus = isWorkspaceExpired(session.lifecycleStatus, expiresAt, now)
          ? LifecycleStatus.EXPIRED
          : session.lifecycleStatus;

        const item: WorkspaceRecentItem = {
          id: session.id,
          kind: 'ai-director',
          tool: 'ai-director',
          title: getDirectorTitle(session),
          status: session.step,
          lifecycleStatus,
          updatedAt: session.updatedAt,
          createdAt: session.createdAt,
          expiresAt,
          completedAt: session.completedAt,
          lastOpenedAt: session.lastOpenedAt,
        };

        if (itemMatchesStatus(item, query.status)) {
          items.push(item);
        }
      }
    }

    if (!query.tool || query.tool === 'exports') {
      const [directorExports, genericExports] = await Promise.all([
        prisma.directorExportJob.findMany({
          where: {
            status: 'COMPLETED',
            session: { userId, deletedAt: null },
            ...(cursor ? { completedAt: { lt: cursor } } : {}),
          },
          include: { session: { include: { asset: true } } },
          orderBy: { completedAt: 'desc' },
          take: limit,
        }),
        prisma.exportHistory.findMany({
          where: {
            userId,
            status: 'COMPLETED',
            ...(cursor ? { completedAt: { lt: cursor } } : {}),
          },
          include: { project: true },
          orderBy: { completedAt: 'desc' },
          take: limit,
        }),
      ]);

      for (const exportJob of directorExports) {
        const completedAt = exportJob.completedAt ?? exportJob.session.updatedAt;
        const lifecycleStatus =
          exportJob.outputDeletedAt ||
          (exportJob.downloadExpiresAt && exportJob.downloadExpiresAt.getTime() <= now.getTime())
            ? 'DOWNLOAD_EXPIRED'
            : LifecycleStatus.COMPLETED;

        const item: WorkspaceRecentItem = {
          id: exportJob.id,
          kind: 'export',
          tool: 'exports',
          title: `${getDirectorTitle(exportJob.session)} export`,
          status: exportJob.status,
          lifecycleStatus,
          updatedAt: completedAt,
          createdAt: completedAt,
          expiresAt: exportJob.session.expiresAt,
          completedAt,
          lastOpenedAt: exportJob.session.lastOpenedAt,
          downloadExpiresAt: exportJob.downloadExpiresAt,
          sourceId: exportJob.sessionId,
        };

        if (itemMatchesStatus(item, query.status)) {
          items.push(item);
        }
      }

      for (const exportJob of genericExports) {
        const completedAt = exportJob.completedAt ?? exportJob.createdAt;
        const lifecycleStatus =
          exportJob.urlExpiresAt && exportJob.urlExpiresAt.getTime() <= now.getTime()
            ? 'DOWNLOAD_EXPIRED'
            : LifecycleStatus.COMPLETED;
        const item: WorkspaceRecentItem = {
          id: exportJob.id,
          kind: 'export',
          tool: 'exports',
          title: `${exportJob.project?.title ?? 'Video export'} export`,
          status: exportJob.status,
          lifecycleStatus,
          updatedAt: completedAt,
          createdAt: exportJob.createdAt,
          expiresAt: exportJob.expiresAt,
          completedAt,
          lastOpenedAt: null,
          downloadExpiresAt: exportJob.urlExpiresAt,
          sourceId: exportJob.projectId,
        };

        if (itemMatchesStatus(item, query.status)) {
          items.push(item);
        }
      }
    }

    const sorted = items.sort(sortRecentItems).slice(0, limit);
    return {
      items: sorted,
      nextCursor:
        sorted.length === limit ? sorted[sorted.length - 1]?.updatedAt.toISOString() : null,
    };
  },

  async getLastActive(userId: string, tool: Exclude<WorkspaceTool, 'exports'>) {
    const now = new Date();

    if (tool === 'video-studio') {
      const projects = await prisma.project.findMany({
        where: {
          userId,
          lifecycleStatus: LifecycleStatus.ACTIVE,
          deletedAt: null,
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
        orderBy: { updatedAt: 'desc' },
        take: 20,
      });

      for (const project of projects) {
        if (!isVideoStudioProjectStoryData(project.storyData)) {
          continue;
        }

        const expiresAt = resolveWorkspaceExpiresAt(project);
        if (isWorkspaceExpired(project.lifecycleStatus, expiresAt, now)) {
          continue;
        }

        return {
          id: project.id,
          kind: 'video-studio' as const,
          tool: 'video-studio' as const,
          title: getVideoStudioTitle(project),
          status: project.status,
          lifecycleStatus: project.lifecycleStatus,
          updatedAt: project.updatedAt,
          createdAt: project.createdAt,
          expiresAt,
          completedAt: project.completedAt,
          lastOpenedAt: project.lastOpenedAt,
        };
      }

      return null;
    }

    const sessions = await prisma.directorSession.findMany({
      where: {
        userId,
        lifecycleStatus: LifecycleStatus.ACTIVE,
        deletedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      include: { asset: true },
      orderBy: { updatedAt: 'desc' },
      take: 20,
    });

    for (const session of sessions) {
      const expiresAt = resolveWorkspaceExpiresAt(session);
      if (isWorkspaceExpired(session.lifecycleStatus, expiresAt, now)) {
        continue;
      }

      return {
        id: session.id,
        kind: 'ai-director' as const,
        tool: 'ai-director' as const,
        title: getDirectorTitle(session),
        status: session.step,
        lifecycleStatus: session.lifecycleStatus,
        updatedAt: session.updatedAt,
        createdAt: session.createdAt,
        expiresAt,
        completedAt: session.completedAt,
        lastOpenedAt: session.lastOpenedAt,
      };
    }

    return null;
  },

  async completeWorkspace(userId: string, kind: WorkspaceKind, id: string) {
    const now = new Date();
    const expiresAt = getCompletedSessionExpiresAt(now);

    if (kind === 'video-studio') {
      const existing = await prisma.project.findFirst({ where: { id, userId, deletedAt: null } });
      if (!existing) {
        return null;
      }
      assertWorkspaceActive(existing.lifecycleStatus, existing.expiresAt);

      return prisma.project.update({
        where: { id },
        data: {
          status: ProjectStatus.COMPLETED,
          lifecycleStatus: LifecycleStatus.COMPLETED,
          completedAt: now,
          expiresAt,
        },
      });
    }

    const existing = await prisma.directorSession.findFirst({
      where: { id, userId, deletedAt: null },
    });
    if (!existing) {
      return null;
    }
    assertWorkspaceActive(existing.lifecycleStatus, existing.expiresAt);

    return prisma.directorSession.update({
      where: { id },
      data: {
        step: DirectorStep.COMPLETED,
        lifecycleStatus: LifecycleStatus.COMPLETED,
        completedAt: now,
        expiresAt,
      },
    });
  },

  async duplicateWorkspace(userId: string, kind: WorkspaceKind, id: string) {
    const now = new Date();
    const expiresAt = getActiveDraftExpiresAt(now);

    if (kind === 'video-studio') {
      const source = await prisma.project.findFirst({
        where: { id, userId, deletedAt: null },
        include: { assets: true },
      });
      if (!source || !isVideoStudioProjectStoryData(source.storyData)) {
        return null;
      }

      const title = source.title.startsWith('Copy of ') ? source.title : `Copy of ${source.title}`;
      const project = await prisma.project.create({
        data: {
          userId,
          title,
          description: source.description,
          mode: source.mode,
          settings: toInputJson(source.settings),
          status: ProjectStatus.DRAFT,
          storyData: source.storyData === null ? undefined : toInputJson(source.storyData),
          lifecycleStatus: LifecycleStatus.ACTIVE,
          expiresAt,
          assets: {
            create: source.assets.map((asset) => ({
              type: asset.type,
              name: asset.name,
              sourceUrl: asset.sourceUrl,
              r2Key: asset.r2Key,
              metadata: toInputJson(asset.metadata),
            })),
          },
        },
      });

      return project;
    }

    const source = await prisma.directorSession.findFirst({
      where: { id, userId, deletedAt: null },
      include: { asset: true, subtitleStyle: true },
    });
    if (!source) {
      return null;
    }

    return prisma.directorSession.create({
      data: {
        userId,
        step: source.asset ? DirectorStep.ANALYZING : DirectorStep.IMPORT,
        schemaVersion: source.schemaVersion,
        lifecycleStatus: LifecycleStatus.ACTIVE,
        expiresAt,
        asset: source.asset
          ? {
              create: {
                storageKey: source.asset.storageKey,
                contentHash: source.asset.contentHash,
                mimeType: source.asset.mimeType,
                sizeBytes: source.asset.sizeBytes,
                origin: source.asset.origin,
                sourceUrlNormalized: source.asset.sourceUrlNormalized,
                ingestStatus: source.asset.ingestStatus,
                durationMs: source.asset.durationMs,
                thumbnailStorageKey: source.asset.thumbnailStorageKey,
                metadata: toInputJson(source.asset.metadata),
              },
            }
          : undefined,
        subtitleStyle: source.subtitleStyle
          ? {
              create: {
                fontToken: source.subtitleStyle.fontToken,
                textColorToken: source.subtitleStyle.textColorToken,
                bgColorToken: source.subtitleStyle.bgColorToken,
                fontSize: source.subtitleStyle.fontSize,
                position: source.subtitleStyle.position,
                animation: source.subtitleStyle.animation,
                stylePreset: source.subtitleStyle.stylePreset,
                speakerMode: source.subtitleStyle.speakerMode,
                speakerStyles: toInputJson(source.subtitleStyle.speakerStyles),
              },
            }
          : undefined,
      },
    });
  },

  async softDeleteWorkspace(userId: string, kind: WorkspaceKind, id: string) {
    const now = new Date();

    if (kind === 'video-studio') {
      const result = await prisma.project.updateMany({
        where: { id, userId, deletedAt: null },
        data: {
          deletedAt: now,
          lifecycleStatus: LifecycleStatus.DELETED,
        },
      });
      return result.count > 0;
    }

    const result = await prisma.directorSession.updateMany({
      where: { id, userId, deletedAt: null },
      data: {
        deletedAt: now,
        lifecycleStatus: LifecycleStatus.DELETED,
      },
    });
    return result.count > 0;
  },
};
