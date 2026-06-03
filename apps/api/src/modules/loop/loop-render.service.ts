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
  type LoopCreatorProjectDocument,
  type LoopRenderSpec,
  loopCreatorProjectDocumentSchema,
} from './loop.schemas';
import {
  calculateLoopTiming,
  LOOP_TIER_MAX_DURATION_MS,
  type LoopTimingResult,
  resolveLoopOutputDimensions,
} from './loop-calculation';

interface SourceInfo {
  readonly projectId: string;
  readonly title: string;
  readonly assetId: string;
  readonly assetName: string;
  readonly sourceUrl: string | null;
  readonly durationMs: number;
  readonly width: number;
  readonly height: number;
  readonly hasAudio: boolean;
}

interface CreateLoopRenderInput {
  readonly projectId: string;
  readonly userId: string;
  readonly isAdmin: boolean;
  readonly requestId: string;
}

export interface ResolveLoopRenderSpecInput {
  readonly projectId: string;
  readonly userId: string;
  readonly isAdmin: boolean;
}

export interface ResolvedLoopRenderSpec {
  readonly spec: LoopRenderSpec;
  readonly tier: SubscriptionTier | 'ADMIN';
  readonly assetId: string;
  readonly sourceHasAudio: boolean;
  readonly adjustedToTier: boolean;
}

interface OwnedLoopSource {
  readonly project: {
    id: string;
    title: string;
    lifecycleStatus: LifecycleStatus;
    expiresAt: Date | null;
    storyData: unknown;
  };
  readonly document: LoopCreatorProjectDocument;
  readonly asset: ProjectAsset;
  readonly assetPath: string;
}

/**
 * Backend operations for project-backed Loop Creator rendering.
 */
export const loopRenderService = {
  async getSourceInfo(projectId: string, userId: string): Promise<SourceInfo> {
    const source = await getOwnedLoopSource(projectId, userId);
    const [durationMs, resolution, hasAudio] = await Promise.all([
      getVideoDuration(source.assetPath),
      getVideoResolution(source.assetPath),
      hasVideoAudioStream(source.assetPath),
    ]);

    return {
      projectId,
      title: source.project.title,
      assetId: source.asset.id,
      assetName: source.asset.name,
      sourceUrl: source.asset.sourceUrl,
      durationMs: Math.round(durationMs),
      width: resolution.width,
      height: resolution.height,
      hasAudio,
    };
  },

  async createRender(input: CreateLoopRenderInput) {
    const resolved = await resolveLoopRenderSpec(input);
    const { spec: renderSpec, tier } = resolved;
    const quota = input.isAdmin
      ? { allowed: true, remaining: -1 }
      : await paymentService.checkExportQuota(input.userId);

    const timelineData = createLoopTimelineData(renderSpec);
    const fingerprintData = createLoopTimelineData({
      ...renderSpec,
      sourceAssetPath: `project-asset:${resolved.assetId}`,
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
      displayFilenamePrefix: 'loop-creator',
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
      actualDurationMs: renderSpec.actualDurationMs,
      cycleCount: renderSpec.cycleCount,
      adjustedToTier: resolved.adjustedToTier,
      sourceHasAudio: resolved.sourceHasAudio,
    };
  },
};

export class LoopRenderServiceError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly statusCode = 400,
  ) {
    super(message);
    this.name = 'LoopRenderServiceError';
  }
}

export async function resolveLoopRenderSpec(
  input: ResolveLoopRenderSpecInput,
): Promise<ResolvedLoopRenderSpec> {
  const source = await getOwnedLoopSource(input.projectId, input.userId);
  const [sourceDuration, sourceResolution, sourceHasAudio] = await Promise.all([
    getVideoDuration(source.assetPath),
    getVideoResolution(source.assetPath),
    hasVideoAudioStream(source.assetPath),
  ]);
  const sourceDurationMs = Math.round(sourceDuration);
  const trimStartMs = source.document.trim.enabled ? source.document.trim.startMs : 0;
  const trimEndMs = source.document.trim.enabled
    ? (source.document.trim.endMs ?? sourceDurationMs)
    : sourceDurationMs;

  if (trimStartMs < 0 || trimEndMs > sourceDurationMs || trimEndMs <= trimStartMs) {
    throw new LoopRenderServiceError('Rentang potongan video tidak valid.', 'INVALID_TRIM');
  }

  const tier = input.isAdmin ? 'ADMIN' : (await paymentService.getSubscription(input.userId)).tier;
  let timing: LoopTimingResult;
  try {
    timing = calculateLoopTiming({
      selectedSegmentDurationMs: trimEndMs - trimStartMs,
      targetDurationMs: source.document.output.targetDurationMs,
      tierMaxDurationMs: LOOP_TIER_MAX_DURATION_MS[tier],
      transitionMode: source.document.transition.mode,
    });
  } catch (error) {
    throw new LoopRenderServiceError(
      error instanceof Error ? error.message : 'Pengaturan sambungan loop tidak valid.',
      'INVALID_LOOP_SETTINGS',
    );
  }
  const dimensions = resolveLoopOutputDimensions(
    source.document.output.aspectRatio,
    sourceResolution,
    tier,
  );

  return {
    spec: {
      kind: 'loop-creator-render',
      schemaVersion: 1,
      projectId: source.project.id,
      sourceAssetPath: source.assetPath,
      sourceDurationMs,
      sourceHasAudio,
      trimStartMs,
      trimEndMs,
      selectedSegmentDurationMs: trimEndMs - trimStartMs,
      audioMuted: source.document.audioMuted,
      transitionMode: source.document.transition.mode,
      transitionDurationMs: timing.transitionDurationMs,
      cycleDurationMs: timing.cycleDurationMs,
      cycleCount: timing.cycleCount,
      targetDurationMs: source.document.output.targetDurationMs,
      actualDurationMs: timing.actualDurationMs,
      aspectRatio: source.document.output.aspectRatio,
      outputWidth: dimensions.width,
      outputHeight: dimensions.height,
    },
    tier,
    assetId: source.asset.id,
    sourceHasAudio,
    adjustedToTier: timing.adjustedToTier,
  };
}

async function getOwnedLoopSource(projectId: string, userId: string): Promise<OwnedLoopSource> {
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId, deletedAt: null },
    include: { assets: true },
  });
  if (!project) {
    throw new LoopRenderServiceError('Draft Loop Creator tidak ditemukan.', 'NOT_FOUND', 404);
  }

  assertWorkspaceActive(project.lifecycleStatus, project.expiresAt);
  const document = loopCreatorProjectDocumentSchema.parse(project.storyData);
  if (!document.sourceAssetId) {
    throw new LoopRenderServiceError('Upload video sumber sebelum render.', 'SOURCE_REQUIRED');
  }

  const asset = project.assets.find(
    (candidate) => candidate.id === document.sourceAssetId && candidate.type === 'VIDEO',
  );
  if (!asset) {
    throw new WorkspaceLifecycleError(
      ASSET_EXPIRED_CODE,
      'Video sumber sudah tidak tersedia. Upload ulang video untuk melanjutkan.',
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
      'Video sumber sudah tidak tersedia. Upload ulang video untuk melanjutkan.',
    );
  }

  return { project, document, asset, assetPath };
}

function createLoopTimelineData(spec: LoopRenderSpec): TimelineData {
  return {
    renderKind: 'loop-creator',
    loopSpec: spec,
    clips: [
      {
        localPath: spec.sourceAssetPath,
        mediaType: 'video',
        startTime: spec.trimStartMs / 1000,
        endTime: spec.trimEndMs / 1000,
        timelineStartMs: 0,
        timelineEndMs: spec.actualDurationMs,
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
