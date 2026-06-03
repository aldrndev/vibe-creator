import { createHash, randomUUID } from 'node:crypto';
import { access, mkdir, rename, stat, unlink } from 'node:fs/promises';
import { basename, join } from 'node:path';
import type { Prisma } from '@prisma/client';
import { env } from '@/config/env';
import { prisma } from '@/lib/prisma';
import { runFFmpeg } from '@/modules/export/ffmpeg';
import type { WorkspaceThumbnailKind } from './workspace.schemas';
import { assertDownloadAvailable, assertWorkspaceActive } from './workspace-lifecycle';

const VIDEO_STUDIO_PROJECT_KIND = 'video-studio-modern-project';
const LOOP_CREATOR_PROJECT_KIND = 'loop-creator-project';
const REACTION_CREATOR_PROJECT_KIND = 'reaction-creator-project';
const LIVE_STREAM_PROJECT_KIND = 'live-stream-project';
const THUMBNAIL_CACHE_DIR = join(env.MEDIA_INPUT_DIR, 'temp', 'workspace-thumbnails');
const THUMBNAIL_WIDTH = 320;
const THUMBNAIL_SEEK_SECONDS = '0.500';
const THUMBNAIL_RENDER_TIMEOUT_MS = 30_000;
const thumbnailGenerationLocks = new Map<string, Promise<void>>();

interface ThumbnailSource {
  readonly path: string;
  readonly identity: string;
  readonly mediaType: 'video' | 'image';
}

/** Error used by the protected workspace-thumbnail endpoint. */
export class WorkspaceThumbnailError extends Error {
  readonly code: string;
  readonly statusCode: number;

  constructor(message: string, code = 'THUMBNAIL_NOT_AVAILABLE', statusCode = 404) {
    super(message);
    this.name = 'WorkspaceThumbnailError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

function asJsonRecord(value: Prisma.JsonValue | null | undefined): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function readStoryKind(value: Prisma.JsonValue | null | undefined): string | null {
  const kind = asJsonRecord(value)?.kind;
  return typeof kind === 'string' ? kind : null;
}

function resolveProjectAssetPath(projectId: string, r2Key: string): string {
  return join(env.MEDIA_INPUT_DIR, 'projects', projectId, basename(r2Key));
}

function selectProjectAsset(
  project: {
    readonly id: string;
    readonly storyData: Prisma.JsonValue | null;
    readonly assets: ReadonlyArray<{
      id: string;
      type: 'VIDEO' | 'IMAGE' | 'AUDIO' | 'VOICE';
      r2Key: string;
    }>;
  },
  kind: 'video-studio' | 'loop-creator' | 'reaction-video' | 'live-stream',
) {
  const story = asJsonRecord(project.storyData);
  const sourceAssetId =
    kind === 'loop-creator'
      ? story?.sourceAssetId
      : kind === 'reaction-video'
        ? story?.mainAssetId
        : kind === 'live-stream'
          ? story?.sourceAssetId
          : null;
  if (typeof sourceAssetId === 'string') {
    const selected = project.assets.find(
      (asset) => asset.id === sourceAssetId && asset.type === 'VIDEO',
    );
    if (selected) {
      return selected;
    }
  }

  return project.assets.find((asset) => asset.type === 'VIDEO' || asset.type === 'IMAGE') ?? null;
}

async function resolveProjectThumbnailSource(
  userId: string,
  kind: 'video-studio' | 'loop-creator' | 'reaction-video' | 'live-stream',
  id: string,
): Promise<ThumbnailSource> {
  const project = await prisma.project.findFirst({
    where: { id, userId, deletedAt: null },
    include: { assets: true },
  });
  const expectedKind =
    kind === 'video-studio'
      ? VIDEO_STUDIO_PROJECT_KIND
      : kind === 'loop-creator'
        ? LOOP_CREATOR_PROJECT_KIND
        : kind === 'reaction-video'
          ? REACTION_CREATOR_PROJECT_KIND
          : LIVE_STREAM_PROJECT_KIND;
  if (!project || readStoryKind(project.storyData) !== expectedKind) {
    throw new WorkspaceThumbnailError('Preview project tidak tersedia.');
  }

  assertWorkspaceActive(project.lifecycleStatus, project.expiresAt);
  const asset = selectProjectAsset(project, kind);
  if (!asset) {
    throw new WorkspaceThumbnailError('Project belum memiliki media visual.');
  }

  return {
    path: resolveProjectAssetPath(project.id, asset.r2Key),
    identity: `${project.id}:${asset.id}`,
    mediaType: asset.type === 'IMAGE' ? 'image' : 'video',
  };
}

async function resolveDirectorThumbnailSource(
  userId: string,
  id: string,
): Promise<ThumbnailSource> {
  const session = await prisma.directorSession.findFirst({
    where: { id, userId, deletedAt: null },
    include: { asset: true },
  });
  if (!session?.asset) {
    throw new WorkspaceThumbnailError('Preview session tidak tersedia.');
  }

  assertWorkspaceActive(session.lifecycleStatus, session.expiresAt);
  return {
    path: join(env.MEDIA_INPUT_DIR, 'director', basename(session.asset.storageKey)),
    identity: `${session.id}:${session.asset.id}`,
    mediaType: 'video',
  };
}

async function resolveExportThumbnailSource(userId: string, id: string): Promise<ThumbnailSource> {
  const exportJob = await prisma.exportHistory.findFirst({
    where: { id, userId, status: 'COMPLETED' },
  });
  if (exportJob) {
    assertDownloadAvailable(exportJob.urlExpiresAt, exportJob.localPath ? null : new Date());
    if (!exportJob.localPath) {
      throw new WorkspaceThumbnailError('Hasil export tidak tersedia.');
    }
    return {
      path: exportJob.localPath,
      identity: `export:${exportJob.id}:${exportJob.completedAt?.toISOString() ?? ''}`,
      mediaType: 'video',
    };
  }

  const directorExport = await prisma.directorExportJob.findFirst({
    where: { id, status: 'COMPLETED', session: { userId, deletedAt: null } },
  });
  if (!directorExport?.outputStorageKey) {
    throw new WorkspaceThumbnailError('Hasil export tidak tersedia.');
  }

  assertDownloadAvailable(directorExport.downloadExpiresAt, directorExport.outputDeletedAt);
  return {
    path: join(
      env.MEDIA_INPUT_DIR,
      'director',
      'exports',
      basename(directorExport.outputStorageKey),
    ),
    identity: `director-export:${directorExport.id}:${directorExport.completedAt?.toISOString() ?? ''}`,
    mediaType: 'video',
  };
}

async function resolveThumbnailSource(
  userId: string,
  kind: WorkspaceThumbnailKind,
  id: string,
): Promise<ThumbnailSource> {
  if (
    kind === 'video-studio' ||
    kind === 'loop-creator' ||
    kind === 'reaction-video' ||
    kind === 'live-stream'
  ) {
    return resolveProjectThumbnailSource(userId, kind, id);
  }
  if (kind === 'ai-director') {
    return resolveDirectorThumbnailSource(userId, id);
  }
  return resolveExportThumbnailSource(userId, id);
}

async function renderThumbnail(source: ThumbnailSource, outputPath: string): Promise<void> {
  const tempOutputPath = `${outputPath}.${randomUUID()}.jpg`;
  const inputStats = await stat(source.path).catch(() => null);
  if (!inputStats) {
    throw new WorkspaceThumbnailError('Media sumber sudah tidak tersedia.', 'ASSET_EXPIRED', 410);
  }

  await mkdir(THUMBNAIL_CACHE_DIR, { recursive: true });
  const seekArgs = source.mediaType === 'video' ? ['-ss', THUMBNAIL_SEEK_SECONDS] : [];

  try {
    await runFFmpeg({
      args: [
        '-y',
        ...seekArgs,
        '-i',
        source.path,
        '-frames:v',
        '1',
        '-vf',
        `scale=${THUMBNAIL_WIDTH}:-2:force_original_aspect_ratio=decrease`,
        '-q:v',
        '4',
        '-progress',
        'pipe:1',
        '-nostats',
        tempOutputPath,
      ],
      tempDir: THUMBNAIL_CACHE_DIR,
      totalDurationMs: 1000,
      timeoutMs: THUMBNAIL_RENDER_TIMEOUT_MS,
    });
    await rename(tempOutputPath, outputPath);
  } catch (error) {
    await unlink(tempOutputPath).catch(() => undefined);
    throw error;
  }
}

async function ensureThumbnail(source: ThumbnailSource, outputPath: string): Promise<void> {
  try {
    await access(outputPath);
    return;
  } catch {
    // Generate the thumbnail if this cache key has not been produced yet.
  }

  const activeGeneration = thumbnailGenerationLocks.get(outputPath);
  if (activeGeneration) {
    await activeGeneration;
    return;
  }

  const generation = renderThumbnail(source, outputPath).finally(() => {
    thumbnailGenerationLocks.delete(outputPath);
  });
  thumbnailGenerationLocks.set(outputPath, generation);
  await generation;
}

/**
 * Resolves or produces a cached, owner-scoped thumbnail file for a workspace history item.
 */
export async function getWorkspaceThumbnailFile(
  userId: string,
  kind: WorkspaceThumbnailKind,
  id: string,
): Promise<string> {
  const source = await resolveThumbnailSource(userId, kind, id);
  const sourceStats = await stat(source.path).catch(() => null);
  if (!sourceStats) {
    throw new WorkspaceThumbnailError('Media sumber sudah tidak tersedia.', 'ASSET_EXPIRED', 410);
  }
  const key = createHash('sha256')
    .update(`${source.identity}:${sourceStats.size}:${sourceStats.mtimeMs}`)
    .digest('hex');
  const outputPath = join(THUMBNAIL_CACHE_DIR, `${key}.jpg`);
  await ensureThumbnail(source, outputPath);
  return outputPath;
}
