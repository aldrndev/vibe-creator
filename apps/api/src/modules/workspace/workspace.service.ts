import { randomUUID } from 'node:crypto';
import { copyFile, mkdir } from 'node:fs/promises';
import { basename, join } from 'node:path';
import {
  type AssetType,
  DirectorStep,
  LifecycleStatus,
  type Prisma,
  ProjectStatus,
} from '@prisma/client';
import { env } from '@/config/env';
import { prisma } from '@/lib/prisma';
import type {
  RecentWorkspacesQuery,
  WorkspaceDeleteKind,
  WorkspaceKind,
  WorkspaceTool,
} from './workspace.schemas';
import {
  assertWorkspaceActive,
  getActiveDraftExpiresAt,
  getCompletedSessionExpiresAt,
  isWorkspaceExpired,
  resolveWorkspaceExpiresAt,
} from './workspace-lifecycle';

const VIDEO_STUDIO_PROJECT_KIND = 'video-studio-modern-project';
const LOOP_CREATOR_PROJECT_KIND = 'loop-creator-project';
const REACTION_CREATOR_PROJECT_KIND = 'reaction-creator-project';
const LIVE_STREAM_PROJECT_KIND = 'live-stream-project';
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
  readonly sourceKind?: WorkspaceKind | null;
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

function isLoopCreatorProjectStoryData(value: Prisma.JsonValue | null | undefined): boolean {
  return asJsonRecord(value)?.kind === LOOP_CREATOR_PROJECT_KIND;
}

function isReactionCreatorProjectStoryData(value: Prisma.JsonValue | null | undefined): boolean {
  return asJsonRecord(value)?.kind === REACTION_CREATOR_PROJECT_KIND;
}

function isLiveStreamProjectStoryData(value: Prisma.JsonValue | null | undefined): boolean {
  return asJsonRecord(value)?.kind === LIVE_STREAM_PROJECT_KIND;
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

  if (status === 'EXPIRED') {
    return (
      item.lifecycleStatus === LifecycleStatus.EXPIRED ||
      item.lifecycleStatus === 'DOWNLOAD_EXPIRED'
    );
  }

  return item.lifecycleStatus === status;
}

function sortRecentItems(left: WorkspaceRecentItem, right: WorkspaceRecentItem): number {
  return right.updatedAt.getTime() - left.updatedAt.getTime() || right.id.localeCompare(left.id);
}

function resolveProjectKind(storyData: Prisma.JsonValue | null | undefined): WorkspaceKind | null {
  if (isVideoStudioProjectStoryData(storyData)) return 'video-studio';
  if (isLoopCreatorProjectStoryData(storyData)) return 'loop-creator';
  if (isReactionCreatorProjectStoryData(storyData)) return 'reaction-video';
  if (isLiveStreamProjectStoryData(storyData)) return 'live-stream';
  return null;
}

async function fetchRecentProjects(
  userId: string,
  cursor: Date | null,
  take: number,
  queryTool: string | undefined,
  queryStatus: RecentWorkspacesQuery['status'],
  now: Date,
): Promise<WorkspaceRecentItem[]> {
  const items: WorkspaceRecentItem[] = [];
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
    const kind = resolveProjectKind(project.storyData);
    if (!kind || (queryTool && queryTool !== kind)) {
      continue;
    }

    const expiresAt = resolveWorkspaceExpiresAt(project);
    const lifecycleStatus = isWorkspaceExpired(project.lifecycleStatus, expiresAt, now)
      ? LifecycleStatus.EXPIRED
      : project.lifecycleStatus;

    const item: WorkspaceRecentItem = {
      id: project.id,
      kind,
      tool: kind,
      title: kind === 'video-studio' ? getVideoStudioTitle(project) : project.title,
      status: project.status,
      lifecycleStatus,
      updatedAt: project.updatedAt,
      createdAt: project.createdAt,
      expiresAt,
      completedAt: project.completedAt,
      lastOpenedAt: project.lastOpenedAt,
    };

    if (itemMatchesStatus(item, queryStatus)) {
      items.push(item);
    }
  }
  return items;
}

async function fetchRecentDirectorSessions(
  userId: string,
  cursor: Date | null,
  take: number,
  queryStatus: RecentWorkspacesQuery['status'],
  now: Date,
): Promise<WorkspaceRecentItem[]> {
  const items: WorkspaceRecentItem[] = [];
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

    if (itemMatchesStatus(item, queryStatus)) {
      items.push(item);
    }
  }
  return items;
}

function mapDirectorExportToRecentItem(
  exportJob: {
    id: string;
    status: string;
    completedAt: Date | null;
    outputDeletedAt: Date | null;
    downloadExpiresAt: Date | null;
    sessionId: string;
    session: {
      updatedAt: Date;
      expiresAt: Date | null;
      lastOpenedAt: Date | null;
      id: string;
      asset: { metadata: Prisma.JsonValue; storageKey: string } | null;
    };
  },
  now: Date,
  queryStatus: RecentWorkspacesQuery['status'],
): WorkspaceRecentItem | null {
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
    sourceKind: 'ai-director',
  };

  return itemMatchesStatus(item, queryStatus) ? item : null;
}

function mapGenericExportToRecentItem(
  exportJob: {
    id: string;
    status: string;
    completedAt: Date | null;
    createdAt: Date;
    urlExpiresAt: Date | null;
    expiresAt: Date | null;
    projectId: string | null;
    project: { title: string; storyData: Prisma.JsonValue | null } | null;
  },
  now: Date,
  queryStatus: RecentWorkspacesQuery['status'],
): WorkspaceRecentItem | null {
  const completedAt = exportJob.completedAt ?? exportJob.createdAt;
  const lifecycleStatus =
    exportJob.urlExpiresAt && exportJob.urlExpiresAt.getTime() <= now.getTime()
      ? 'DOWNLOAD_EXPIRED'
      : LifecycleStatus.COMPLETED;
  const sourceKind = resolveProjectKind(exportJob.project?.storyData) ?? 'video-studio';

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
    sourceKind,
  };

  return itemMatchesStatus(item, queryStatus) ? item : null;
}

async function fetchRecentExports(
  userId: string,
  cursor: Date | null,
  limit: number,
  queryStatus: RecentWorkspacesQuery['status'],
  now: Date,
): Promise<WorkspaceRecentItem[]> {
  const items: WorkspaceRecentItem[] = [];
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
    const item = mapDirectorExportToRecentItem(exportJob, now, queryStatus);
    if (item) {
      items.push(item);
    }
  }

  for (const exportJob of genericExports) {
    const item = mapGenericExportToRecentItem(exportJob, now, queryStatus);
    if (item) {
      items.push(item);
    }
  }

  return items;
}

async function getLastActiveProject(
  userId: string,
  tool: Exclude<WorkspaceTool, 'exports'>,
  now: Date,
) {
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
    const matchesTool = resolveProjectKind(project.storyData) === tool;
    if (!matchesTool) {
      continue;
    }

    const expiresAt = resolveWorkspaceExpiresAt(project);
    if (isWorkspaceExpired(project.lifecycleStatus, expiresAt, now)) {
      continue;
    }

    return {
      id: project.id,
      kind: tool,
      tool,
      title: tool === 'video-studio' ? getVideoStudioTitle(project) : project.title,
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

async function getLastActiveDirectorSession(userId: string, now: Date) {
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
}

async function duplicateProjectWorkspace(
  userId: string,
  kind: WorkspaceKind,
  id: string,
  expiresAt: Date,
) {
  const source = await prisma.project.findFirst({
    where: { id, userId, deletedAt: null },
    include: { assets: true },
  });
  const validStory = resolveProjectKind(source?.storyData) === kind;
  if (!source || !validStory) {
    return null;
  }

  const title = source.title.startsWith('Copy of ') ? source.title : `Copy of ${source.title}`;
  if (kind === 'loop-creator') {
    return duplicateLoopCreatorProject(source, userId, title, expiresAt);
  }
  if (kind === 'reaction-video') {
    return duplicateReactionCreatorProject(source, userId, title, expiresAt);
  }
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

async function duplicateDirectorWorkspace(userId: string, id: string, expiresAt: Date) {
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
}

export const workspaceService = {
  async listRecent(userId: string, query: RecentWorkspacesQuery) {
    const limit = clampRecentLimit(query.limit);
    const cursor = cursorDate(query.cursor);
    const now = new Date();
    const take = limit * 3;
    const items: WorkspaceRecentItem[] = [];

    if (
      !query.tool ||
      ['video-studio', 'loop-creator', 'reaction-video', 'live-stream'].includes(query.tool)
    ) {
      items.push(
        ...(await fetchRecentProjects(userId, cursor, take, query.tool, query.status, now)),
      );
    }

    if (!query.tool || query.tool === 'ai-director') {
      items.push(...(await fetchRecentDirectorSessions(userId, cursor, take, query.status, now)));
    }

    if (!query.tool || query.tool === 'exports') {
      items.push(...(await fetchRecentExports(userId, cursor, limit, query.status, now)));
    }

    const sorted = items.sort(sortRecentItems);
    const sliced = sorted.slice(0, limit);
    return {
      items: sliced,
      nextCursor: sorted.length > limit ? sliced[sliced.length - 1]?.updatedAt.toISOString() : null,
    };
  },

  async getLastActive(userId: string, tool: Exclude<WorkspaceTool, 'exports'>) {
    const now = new Date();

    if (['video-studio', 'loop-creator', 'reaction-video', 'live-stream'].includes(tool)) {
      return getLastActiveProject(userId, tool, now);
    }

    return getLastActiveDirectorSession(userId, now);
  },

  async completeWorkspace(userId: string, kind: WorkspaceKind, id: string) {
    const now = new Date();
    const expiresAt = getCompletedSessionExpiresAt(now);

    if (
      kind === 'video-studio' ||
      kind === 'loop-creator' ||
      kind === 'reaction-video' ||
      kind === 'live-stream'
    ) {
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

    if (['video-studio', 'loop-creator', 'reaction-video', 'live-stream'].includes(kind)) {
      return duplicateProjectWorkspace(userId, kind, id, expiresAt);
    }

    return duplicateDirectorWorkspace(userId, id, expiresAt);
  },

  async softDeleteWorkspace(userId: string, kind: WorkspaceDeleteKind, id: string) {
    const now = new Date();

    if (
      kind === 'video-studio' ||
      kind === 'loop-creator' ||
      kind === 'reaction-video' ||
      kind === 'live-stream'
    ) {
      const result = await prisma.project.updateMany({
        where: { id, userId, deletedAt: null },
        data: {
          deletedAt: now,
          lifecycleStatus: LifecycleStatus.DELETED,
        },
      });
      return result.count > 0;
    }

    if (kind === 'export') {
      const [genericExport, directorExport] = await Promise.all([
        prisma.exportHistory.deleteMany({
          where: {
            id,
            userId,
            OR: [{ urlExpiresAt: { lte: now } }, { expiresAt: { lte: now } }],
          },
        }),
        prisma.directorExportJob.deleteMany({
          where: {
            id,
            session: { userId },
            OR: [{ downloadExpiresAt: { lte: now } }, { outputDeletedAt: { not: null } }],
          },
        }),
      ]);
      return genericExport.count + directorExport.count > 0;
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

async function duplicateLoopCreatorProject(
  source: {
    id: string;
    title: string;
    description: string | null;
    mode: 'STORY' | 'TIMELINE';
    settings: Prisma.JsonValue | null;
    storyData: Prisma.JsonValue | null;
    assets: Array<{
      id: string;
      type: AssetType;
      name: string;
      sourceUrl: string | null;
      r2Key: string;
      metadata: Prisma.JsonValue;
    }>;
  },
  userId: string,
  title: string,
  expiresAt: Date,
) {
  const project = await prisma.project.create({
    data: {
      userId,
      title,
      description: source.description,
      mode: source.mode,
      settings: toInputJson(source.settings),
      status: ProjectStatus.DRAFT,
      storyData: toInputJson(source.storyData),
      lifecycleStatus: LifecycleStatus.ACTIVE,
      expiresAt,
    },
  });
  const idMapping = new Map<string, string>();
  const destinationDir = join(env.MEDIA_INPUT_DIR, 'projects', project.id);
  await mkdir(destinationDir, { recursive: true });

  for (const asset of source.assets) {
    const nextAssetId = randomUUID();
    const fileName = `${nextAssetId}-${basename(asset.r2Key)}`;
    const sourcePath = join(env.MEDIA_INPUT_DIR, 'projects', source.id, basename(asset.r2Key));
    const destinationPath = join(destinationDir, fileName);
    await copyFile(sourcePath, destinationPath);
    await prisma.projectAsset.create({
      data: {
        id: nextAssetId,
        projectId: project.id,
        type: asset.type,
        name: asset.name,
        sourceUrl: `/api/v1/projects/assets/${nextAssetId}/file`,
        r2Key: `uploads/projects/${project.id}/${fileName}`,
        metadata: toInputJson(asset.metadata),
      },
    });
    idMapping.set(asset.id, nextAssetId);
  }

  const storyData = asJsonRecord(source.storyData);
  const sourceAssetId =
    typeof storyData?.sourceAssetId === 'string'
      ? idMapping.get(storyData.sourceAssetId)
      : undefined;
  if (storyData && sourceAssetId) {
    await prisma.project.update({
      where: { id: project.id },
      data: {
        storyData: {
          ...storyData,
          sourceAssetId,
          savedAt: new Date().toISOString(),
        } as Prisma.InputJsonValue,
      },
    });
  }

  return project;
}

async function duplicateReactionCreatorProject(
  source: {
    id: string;
    title: string;
    description: string | null;
    mode: 'STORY' | 'TIMELINE';
    settings: Prisma.JsonValue | null;
    storyData: Prisma.JsonValue | null;
    assets: Array<{
      id: string;
      type: AssetType;
      name: string;
      sourceUrl: string | null;
      r2Key: string;
      metadata: Prisma.JsonValue;
    }>;
  },
  userId: string,
  title: string,
  expiresAt: Date,
) {
  const project = await prisma.project.create({
    data: {
      userId,
      title,
      description: source.description,
      mode: source.mode,
      settings: toInputJson(source.settings),
      status: ProjectStatus.DRAFT,
      storyData: toInputJson(source.storyData),
      lifecycleStatus: LifecycleStatus.ACTIVE,
      expiresAt,
    },
  });
  const idMapping = new Map<string, string>();
  const destinationDir = join(env.MEDIA_INPUT_DIR, 'projects', project.id);
  await mkdir(destinationDir, { recursive: true });

  for (const asset of source.assets) {
    const nextAssetId = randomUUID();
    const fileName = `${nextAssetId}-${basename(asset.r2Key)}`;
    const sourcePath = join(env.MEDIA_INPUT_DIR, 'projects', source.id, basename(asset.r2Key));
    const destinationPath = join(destinationDir, fileName);
    await copyFile(sourcePath, destinationPath);
    await prisma.projectAsset.create({
      data: {
        id: nextAssetId,
        projectId: project.id,
        type: asset.type,
        name: asset.name,
        sourceUrl: `/api/v1/projects/assets/${nextAssetId}/file`,
        r2Key: `uploads/projects/${project.id}/${fileName}`,
        metadata: toInputJson(asset.metadata),
      },
    });
    idMapping.set(asset.id, nextAssetId);
  }

  const storyData = asJsonRecord(source.storyData);
  if (storyData) {
    const mainAssetId =
      typeof storyData.mainAssetId === 'string' ? idMapping.get(storyData.mainAssetId) : undefined;
    const reactionAssetId =
      typeof storyData.reactionAssetId === 'string'
        ? idMapping.get(storyData.reactionAssetId)
        : undefined;

    await prisma.project.update({
      where: { id: project.id },
      data: {
        storyData: {
          ...storyData,
          ...(mainAssetId ? { mainAssetId } : {}),
          ...(reactionAssetId ? { reactionAssetId } : {}),
          savedAt: new Date().toISOString(),
        } as Prisma.InputJsonValue,
      },
    });
  }

  return project;
}
