import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { LifecycleStatus, ProjectAsset, SubscriptionTier } from '@prisma/client';
import { env } from '@/config/env';
import { prisma } from '@/lib/prisma';
import { exportService, getPendingExportLimit } from '@/modules/export/export.service';
import type { TimelineData } from '@/modules/export/processors/export-processor.types';
import { paymentService } from '@/modules/payment/payment.service';
import {
  ASSET_EXPIRED_CODE,
  assertWorkspaceActive,
  WorkspaceLifecycleError,
} from '@/modules/workspace/workspace-lifecycle';
import { getVideoDuration, getVideoResolution, hasVideoAudioStream } from '@/utils/video-info';
import {
  type ReactionAspectRatio,
  type ReactionCreatorProjectDocument,
  type ReactionRenderSpec,
  reactionCreatorProjectDocumentSchema,
} from './reaction.schemas';

interface ReactionMediaInfo {
  readonly assetId: string;
  readonly assetName: string;
  readonly sourceUrl: string | null;
  readonly durationMs: number;
  readonly width: number;
  readonly height: number;
  readonly hasAudio: boolean;
}

interface ReactionSourceInfo {
  readonly projectId: string;
  readonly title: string;
  readonly main?: ReactionMediaInfo;
  readonly reaction?: ReactionMediaInfo;
}

interface CreateReactionRenderInput {
  readonly projectId: string;
  readonly userId: string;
  readonly isAdmin: boolean;
  readonly requestId: string;
}

interface ResolveReactionRenderSpecInput {
  readonly projectId: string;
  readonly userId: string;
  readonly isAdmin: boolean;
}

interface ResolvedReactionRenderSpec {
  readonly spec: ReactionRenderSpec;
  readonly tier: SubscriptionTier | 'ADMIN';
  readonly mainAssetId: string;
  readonly reactionAssetId: string;
  readonly mainHasAudio: boolean;
  readonly reactionHasAudio: boolean;
}

interface OwnedReactionProject {
  readonly project: {
    readonly id: string;
    readonly title: string;
    readonly lifecycleStatus: LifecycleStatus;
    readonly expiresAt: Date | null;
    readonly storyData: unknown;
  };
  readonly document: ReactionCreatorProjectDocument;
  readonly assets: readonly ProjectAsset[];
}

interface OwnedReactionAsset {
  readonly asset: ProjectAsset;
  readonly assetPath: string;
}

interface VideoResolution {
  readonly width: number;
  readonly height: number;
}

const MAX_FREE_LONG_EDGE = 1280;
const MAX_PAID_LONG_EDGE = 1920;

/**
 * Backend operations for project-backed Reaction Creator rendering.
 */
export const reactionRenderService = {
  async getSourceInfo(projectId: string, userId: string): Promise<ReactionSourceInfo> {
    const owned = await getOwnedReactionProject(projectId, userId);
    const [main, reaction] = await Promise.all([
      owned.document.mainAssetId
        ? getOwnedReactionMediaInfo(projectId, owned.assets, owned.document.mainAssetId)
        : undefined,
      owned.document.reactionAssetId
        ? getOwnedReactionMediaInfo(projectId, owned.assets, owned.document.reactionAssetId)
        : undefined,
    ]);

    return {
      projectId,
      title: owned.project.title,
      main,
      reaction,
    };
  },

  async createRender(input: CreateReactionRenderInput) {
    const resolved = await resolveReactionRenderSpec(input);
    const { spec, tier } = resolved;
    const quota = input.isAdmin
      ? { allowed: true, remaining: -1 }
      : await paymentService.checkExportQuota(input.userId);

    const timelineData = createReactionTimelineData(spec);
    const fingerprintData = createReactionTimelineData({
      ...spec,
      mainAssetPath: `project-asset:${resolved.mainAssetId}`,
      reactionAssetPath: `project-asset:${resolved.reactionAssetId}`,
    });

    const result = await exportService.createJob({
      userId: input.userId,
      projectId: input.projectId,
      timelineData,
      fingerprintTimelineData: fingerprintData,
      format: 'MP4',
      resolution: tier === 'FREE' ? 'SD' : 'HD',
      addWatermark: tier === 'FREE',
      consumeQuotaOnSuccess: !input.isAdmin,
      pendingLimit: getPendingExportLimit(tier),
      requestId: input.requestId,
      quotaAllowed: quota.allowed,
      displayFilenamePrefix: 'reaction',
    });

    return {
      jobId: result.job.id,
      status: result.job.status,
      progress: result.job.progress,
      reused: result.reused,
      cacheState: result.cacheState,
      downloadUrl: result.job.downloadUrl ?? undefined,
      filename: result.job.displayFilename ?? undefined,
      urlExpiresAt: result.job.urlExpiresAt?.toISOString(),
      outputDurationMs: spec.outputDurationMs,
      mainHasAudio: spec.mainHasAudio,
      reactionHasAudio: spec.reactionHasAudio,
    };
  },
};

export class ReactionRenderServiceError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly statusCode = 400,
  ) {
    super(message);
    this.name = 'ReactionRenderServiceError';
  }
}

export async function resolveReactionRenderSpec(
  input: ResolveReactionRenderSpecInput,
): Promise<ResolvedReactionRenderSpec> {
  const owned = await getOwnedReactionProject(input.projectId, input.userId);
  const { document } = owned;

  if (!document.mainAssetId) {
    throw new ReactionRenderServiceError(
      'Upload video utama sebelum render reaction.',
      'MAIN_VIDEO_REQUIRED',
    );
  }
  if (!document.reactionAssetId) {
    throw new ReactionRenderServiceError(
      'Record atau upload video reaction sebelum render.',
      'REACTION_VIDEO_REQUIRED',
    );
  }

  const main = getOwnedReactionAsset(input.projectId, owned.assets, document.mainAssetId, 'main');
  const reaction = getOwnedReactionAsset(
    input.projectId,
    owned.assets,
    document.reactionAssetId,
    'reaction',
  );

  const [mainDuration, reactionDuration, mainResolution, mainHasAudio, reactionHasAudio] =
    await Promise.all([
      getVideoDuration(main.assetPath),
      getVideoDuration(reaction.assetPath),
      getVideoResolution(main.assetPath),
      hasVideoAudioStream(main.assetPath),
      hasVideoAudioStream(reaction.assetPath),
    ]);

  const tier = input.isAdmin ? 'ADMIN' : (await paymentService.getSubscription(input.userId)).tier;
  const dimensions = resolveReactionOutputDimensions(
    document.output.aspectRatio,
    mainResolution,
    tier,
  );

  return {
    spec: {
      kind: 'reaction-render',
      schemaVersion: 1,
      projectId: owned.project.id,
      mainAssetPath: main.assetPath,
      reactionAssetPath: reaction.assetPath,
      mainHasAudio,
      reactionHasAudio,
      mainDurationMs: Math.round(mainDuration),
      reactionDurationMs: Math.round(reactionDuration),
      layoutMode: document.layout.mode,
      aspectRatio: document.output.aspectRatio,
      pipPosition: document.layout.pipPosition,
      pipScale: document.layout.pipScale,
      circular: document.layout.circular,
      splitOrientation: document.layout.splitOrientation,
      mainPlacement: document.layout.mainPlacement,
      splitRatio: document.layout.splitRatio,
      smoothBorder: document.layout.smoothBorder,
      blurOverlay: document.layout.blurOverlay ?? false,
      mainFraming: document.layout.mainFraming,
      reactionFraming: document.layout.reactionFraming,
      mainVolume: document.audio.mainVolume,
      reactionVolume: document.audio.reactionVolume,
      muteMain: document.audio.muteMain,
      muteReaction: document.audio.muteReaction,
      reactionOffsetMs: document.sync.reactionOffsetMs,
      outputDurationMs: Math.round(mainDuration),
      outputWidth: dimensions.width,
      outputHeight: dimensions.height,
    },
    tier,
    mainAssetId: main.asset.id,
    reactionAssetId: reaction.asset.id,
    mainHasAudio,
    reactionHasAudio,
  };
}

function createReactionTimelineData(spec: ReactionRenderSpec): TimelineData {
  return {
    renderKind: 'reaction-creator',
    reactionSpec: spec,
    clips: [
      {
        localPath: spec.mainAssetPath,
        mediaType: 'video',
        startTime: 0,
        endTime: spec.outputDurationMs / 1000,
        timelineStartMs: 0,
        timelineEndMs: spec.outputDurationMs,
        visible: true,
      },
      {
        localPath: spec.reactionAssetPath,
        mediaType: 'video',
        startTime: 0,
        endTime: spec.reactionDurationMs / 1000,
        timelineStartMs: Math.max(0, spec.reactionOffsetMs),
        timelineEndMs: spec.outputDurationMs,
        visible: true,
      },
    ],
    settings: {
      width: spec.outputWidth,
      height: spec.outputHeight,
      fps: 30,
      backgroundMode: spec.aspectRatio === 'original' ? 'solid' : 'blur',
      backgroundColor: '#000000',
    },
  };
}

async function getOwnedReactionProject(
  projectId: string,
  userId: string,
): Promise<OwnedReactionProject> {
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId, deletedAt: null },
    include: { assets: true },
  });
  if (!project) {
    throw new ReactionRenderServiceError(
      'Draft Reaction Creator tidak ditemukan.',
      'NOT_FOUND',
      404,
    );
  }

  assertWorkspaceActive(project.lifecycleStatus, project.expiresAt);
  const document = reactionCreatorProjectDocumentSchema.parse(project.storyData);

  return {
    project,
    document,
    assets: project.assets,
  };
}

async function getOwnedReactionMediaInfo(
  projectId: string,
  assets: readonly ProjectAsset[],
  assetId: string,
): Promise<ReactionMediaInfo> {
  const owned = getOwnedReactionAsset(projectId, assets, assetId, 'media');
  const [durationMs, resolution, hasAudio] = await Promise.all([
    getVideoDuration(owned.assetPath),
    getVideoResolution(owned.assetPath),
    hasVideoAudioStream(owned.assetPath),
  ]);

  return {
    assetId: owned.asset.id,
    assetName: owned.asset.name,
    sourceUrl: owned.asset.sourceUrl,
    durationMs: Math.round(durationMs),
    width: resolution.width,
    height: resolution.height,
    hasAudio,
  };
}

function getOwnedReactionAsset(
  projectId: string,
  assets: readonly ProjectAsset[],
  assetId: string,
  role: 'main' | 'reaction' | 'media',
): OwnedReactionAsset {
  const asset = assets.find((candidate) => candidate.id === assetId && candidate.type === 'VIDEO');
  if (!asset) {
    throw new WorkspaceLifecycleError(
      ASSET_EXPIRED_CODE,
      role === 'main'
        ? 'Video utama sudah tidak tersedia. Upload ulang video untuk melanjutkan.'
        : 'Video reaction sudah tidak tersedia. Upload ulang atau record ulang untuk melanjutkan.',
    );
  }

  const assetPath = join(
    env.MEDIA_INPUT_DIR,
    'projects',
    projectId,
    asset.r2Key.split('/').pop() ?? '',
  );
  if (!existsSync(assetPath)) {
    throw new WorkspaceLifecycleError(
      ASSET_EXPIRED_CODE,
      role === 'main'
        ? 'Video utama sudah tidak tersedia. Upload ulang video untuk melanjutkan.'
        : 'Video reaction sudah tidak tersedia. Upload ulang atau record ulang untuk melanjutkan.',
    );
  }

  return { asset, assetPath };
}

function resolveReactionOutputDimensions(
  aspectRatio: ReactionAspectRatio,
  source: VideoResolution,
  tier: SubscriptionTier | 'ADMIN',
): VideoResolution {
  if (aspectRatio !== 'original') {
    return resolvePresetDimensions(aspectRatio, tier);
  }

  const maxLongEdge = tier === 'FREE' ? MAX_FREE_LONG_EDGE : MAX_PAID_LONG_EDGE;
  const longEdge = Math.max(source.width, source.height);
  if (longEdge <= maxLongEdge) {
    return {
      width: makeEven(source.width),
      height: makeEven(source.height),
    };
  }

  const scale = maxLongEdge / longEdge;
  return {
    width: makeEven(source.width * scale),
    height: makeEven(source.height * scale),
  };
}

function resolvePresetDimensions(
  aspectRatio: Exclude<ReactionAspectRatio, 'original'>,
  tier: SubscriptionTier | 'ADMIN',
): VideoResolution {
  const premium = tier !== 'FREE';
  switch (aspectRatio) {
    case '16:9':
      return premium ? { width: 1920, height: 1080 } : { width: 1280, height: 720 };
    case '9:16':
      return premium ? { width: 1080, height: 1920 } : { width: 720, height: 1280 };
    case '1:1':
      return premium ? { width: 1080, height: 1080 } : { width: 720, height: 720 };
    case '4:5':
      return premium ? { width: 1080, height: 1350 } : { width: 720, height: 900 };
  }
}

function makeEven(value: number): number {
  return Math.max(2, Math.round(value / 2) * 2);
}
