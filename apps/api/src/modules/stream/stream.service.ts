/**
 * Stream Service
 * RTMP live streaming service - main facade
 */

import { stat } from 'node:fs/promises';
import { join } from 'node:path';
import type { Prisma, StreamSession as PrismaStreamSession } from '@prisma/client';
import { env } from '@/config/env';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { assertWorkspaceActive } from '@/modules/workspace/workspace-lifecycle';
import { getVideoDuration, getVideoResolution, hasVideoAudioStream } from '@/utils/video-info';
import { billingService } from '../billing/billing.service';
import {
  isStreamActive,
  requestStreamProcessStop,
  requestUserStreamStop,
  scheduleStreamLive,
  startStreamProcess,
} from './services/process.manager';
import { setStopStreamHandler, startStreamReaper } from './services/reaper';
import { buildStreamArgs, getRtmpUrl, type StreamConfig } from './services/rtmp.utils';
import { type LiveStreamProjectDocument, liveStreamProjectDocumentSchema } from './stream.schemas';

export type { StreamConfig, StreamPlatform } from './services/rtmp.utils';

type StreamStopReasonInput =
  | 'USER_REQUEST'
  | 'AUTO_STOP'
  | 'ADMIN'
  | 'ERROR'
  | 'REPLACED_BY_NEW_STREAM'
  | 'PROCESS_LOST';

type StreamFinalStatus = 'ENDED' | 'FAILED';

interface StartStreamInput {
  readonly userId: string;
  readonly inputPath: string;
  readonly config: StreamConfig;
  readonly projectId?: string;
  readonly sourceAssetId?: string;
}

interface StartProjectStreamInput {
  readonly userId: string;
  readonly projectId: string;
  readonly streamKey: string;
  readonly customRtmpUrl?: string;
}

interface FinalizeStreamInput {
  readonly streamId: string;
  readonly userId: string;
  readonly status: StreamFinalStatus;
  readonly reason: StreamStopReasonInput;
  readonly errorMessage?: string;
}

interface PublicStreamSession {
  readonly id: string;
  readonly platform: string;
  readonly status: PrismaStreamSession['status'];
  readonly startedAt: Date;
  readonly endedAt: Date | null;
  readonly autoStopAt: Date | null;
  readonly durationMinutesBilled: number | null;
  readonly stopReason: PrismaStreamSession['stopReason'];
  readonly errorMessage: string | null;
  readonly config: Prisma.JsonValue | null;
  readonly isActive?: boolean;
}

const ABSOLUTE_MAX_DURATION = 1440; // 24 hours
const REPLACEMENT_SHUTDOWN_DELAY_MS = 1000;

function resolveProjectAssetPath(projectId: string, r2Key: string): string {
  return join(env.MEDIA_INPUT_DIR, 'projects', projectId, r2Key.split('/').pop() ?? '');
}

function getMetadataNumber(metadata: Prisma.JsonValue, key: string): number | null {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return null;
  }

  const value = (metadata as Record<string, unknown>)[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function getMetadataBoolean(metadata: Prisma.JsonValue, key: string): boolean | null {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return null;
  }

  const value = (metadata as Record<string, unknown>)[key];
  return typeof value === 'boolean' ? value : null;
}

async function resolveVideoInfo(inputPath: string): Promise<{
  durationMs: number;
  width: number;
  height: number;
  hasAudio: boolean;
}> {
  const [durationMs, resolution, hasAudio] = await Promise.all([
    getVideoDuration(inputPath),
    getVideoResolution(inputPath),
    hasVideoAudioStream(inputPath),
  ]);

  return {
    durationMs: Math.round(durationMs),
    width: resolution.width,
    height: resolution.height,
    hasAudio,
  };
}

async function getOwnedLiveStreamProject(projectId: string, userId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId, deletedAt: null },
    include: { assets: true },
  });

  if (!project) {
    throw new Error('Project live stream tidak ditemukan.');
  }

  assertWorkspaceActive(
    project.lifecycleStatus,
    project.expiresAt,
    'Project live stream sudah expired.',
  );

  const document = liveStreamProjectDocumentSchema.parse(project.storyData);
  return { project, document };
}

function getSourceAsset(
  project: Awaited<ReturnType<typeof getOwnedLiveStreamProject>>['project'],
  document: LiveStreamProjectDocument,
) {
  if (!document.sourceAssetId) {
    throw new Error('Upload video source sebelum mulai live.');
  }

  const asset = project.assets.find((item) => item.id === document.sourceAssetId);
  if (!asset || asset.type !== 'VIDEO') {
    throw new Error('Source video live stream tidak tersedia.');
  }

  return asset;
}

async function stopActiveStreamsForUser(userId: string): Promise<void> {
  const runtimeStreamId = requestUserStreamStop(userId);
  if (runtimeStreamId) {
    await streamService.finalizeStream({
      streamId: runtimeStreamId,
      userId,
      status: 'ENDED',
      reason: 'REPLACED_BY_NEW_STREAM',
      errorMessage: 'Stream diganti dengan sesi baru.',
    });
    await new Promise((resolve) => setTimeout(resolve, REPLACEMENT_SHUTDOWN_DELAY_MS));
  }

  const dbActiveStreams = await prisma.streamSession.findMany({
    where: {
      userId,
      status: { in: ['STARTING', 'LIVE', 'STOPPING'] },
      durationMinutesBilled: null,
    },
    select: { id: true },
  });

  for (const stream of dbActiveStreams) {
    await streamService.finalizeStream({
      streamId: stream.id,
      userId,
      status: 'ENDED',
      reason: 'REPLACED_BY_NEW_STREAM',
      errorMessage: 'Stream diganti dengan sesi baru.',
    });
  }
}

function createHistoryCursor(stream: { startedAt: Date; id: string }): string {
  return Buffer.from(
    JSON.stringify({ startedAt: stream.startedAt.toISOString(), id: stream.id }),
  ).toString('base64url');
}

function parseHistoryCursor(cursor: string | undefined): { startedAt: Date; id: string } | null {
  if (!cursor) {
    return null;
  }

  try {
    const decoded = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as unknown;
    if (!decoded || typeof decoded !== 'object' || Array.isArray(decoded)) {
      return null;
    }

    const record = decoded as Record<string, unknown>;
    const startedAt = typeof record.startedAt === 'string' ? new Date(record.startedAt) : null;
    const id = typeof record.id === 'string' ? record.id : null;
    if (!startedAt || Number.isNaN(startedAt.getTime()) || !id) {
      return null;
    }

    return { startedAt, id };
  } catch {
    return null;
  }
}

function toPublicStreamSession(
  stream: PrismaStreamSession,
  options: { isActive?: boolean } = {},
): PublicStreamSession {
  return {
    id: stream.id,
    platform: stream.platform,
    status: stream.status,
    startedAt: stream.startedAt,
    endedAt: stream.endedAt,
    autoStopAt: stream.autoStopAt,
    durationMinutesBilled: stream.durationMinutesBilled,
    stopReason: stream.stopReason,
    errorMessage: stream.errorMessage,
    config: stream.config,
    ...(typeof options.isActive === 'boolean' ? { isActive: options.isActive } : {}),
  };
}

export const streamService = {
  /**
   * Start streaming video to RTMP server.
   */
  async startStream(input: StartStreamInput): Promise<{
    streamId: string;
    status: 'STARTING';
    effectiveDurationMinutes: number;
    autoStopAt: string;
    quotaRemainingAfterReservation: number;
  }> {
    const { userId, inputPath, config } = input;

    await stat(inputPath).catch(() => {
      throw new Error('Source video sudah tidak tersedia.');
    });

    await stopActiveStreamsForUser(userId);

    const cycle = await billingService.getOrCreateOpenCycle(userId);
    const quotaTotal = cycle.quotaMinutesBase + cycle.quotaMinutesTopup;
    const quotaRemaining = Math.max(0, quotaTotal - cycle.quotaMinutesUsed);

    if (quotaRemaining <= 0) {
      throw new Error('Kuota live streaming habis. Upgrade atau top-up untuk lanjut.');
    }

    const requestedDuration = config.durationMinutes || 60;
    const effectiveDuration = Math.min(requestedDuration, quotaRemaining, ABSOLUTE_MAX_DURATION);
    const autoStopAt = new Date(Date.now() + effectiveDuration * 60 * 1000);
    const sourceInfo = await resolveVideoInfo(inputPath);

    const stream = await prisma.streamSession.create({
      data: {
        userId,
        projectId: input.projectId,
        sourceAssetId: input.sourceAssetId,
        platform: config.platform,
        status: 'STARTING',
        startedAt: new Date(),
        autoStopAt,
        quotaCycleId: cycle.id,
        config: {
          quality: config.quality,
          bitrateKbps: config.bitrateKbps,
          platform: config.platform,
          requestedDurationMinutes: requestedDuration,
          effectiveDurationMinutes: effectiveDuration,
          sourceHasAudio: sourceInfo.hasAudio,
          sourceDurationMs: sourceInfo.durationMs,
          sourceWidth: sourceInfo.width,
          sourceHeight: sourceInfo.height,
        },
      },
    });

    const rtmpUrl = getRtmpUrl(config.platform, config.streamKey, config.rtmpUrl);
    const args = buildStreamArgs(inputPath, config, rtmpUrl, sourceInfo.hasAudio);

    startStreamProcess(stream.id, userId, args, async (exit) => {
      if (exit.errorMessage) {
        await streamService.finalizeStream({
          streamId: stream.id,
          userId,
          status: 'FAILED',
          reason: 'ERROR',
          errorMessage: 'FFmpeg stream process failed.',
        });
        return;
      }

      const latest = await prisma.streamSession.findUnique({
        where: { id: stream.id },
        select: { durationMinutesBilled: true, stopReason: true },
      });
      if (latest?.durationMinutesBilled !== null) {
        return;
      }

      await streamService.finalizeStream({
        streamId: stream.id,
        userId,
        status: exit.code === 0 ? 'ENDED' : 'FAILED',
        reason: exit.code === 0 ? 'AUTO_STOP' : 'ERROR',
        errorMessage: exit.code === 0 ? undefined : 'FFmpeg stream process exited unexpectedly.',
      });
    });
    scheduleStreamLive(stream.id);

    logger.info(
      {
        streamId: stream.id,
        userId,
        platform: config.platform,
        autoStopAt,
        projectId: input.projectId,
        sourceAssetId: input.sourceAssetId,
      },
      'Stream started',
    );

    return {
      streamId: stream.id,
      status: 'STARTING',
      effectiveDurationMinutes: effectiveDuration,
      autoStopAt: autoStopAt.toISOString(),
      quotaRemainingAfterReservation: Math.max(0, quotaRemaining - effectiveDuration),
    };
  },

  async startProjectStream(input: StartProjectStreamInput) {
    const { project, document } = await getOwnedLiveStreamProject(input.projectId, input.userId);
    const sourceAsset = getSourceAsset(project, document);
    const inputPath = resolveProjectAssetPath(project.id, sourceAsset.r2Key);

    return this.startStream({
      userId: input.userId,
      inputPath,
      projectId: project.id,
      sourceAssetId: sourceAsset.id,
      config: {
        platform: document.platform,
        rtmpUrl: input.customRtmpUrl ?? document.customRtmpUrl,
        streamKey: input.streamKey,
        quality: document.quality,
        bitrateKbps: document.bitrateKbps,
        durationMinutes: document.durationMinutes,
      },
    });
  },

  async getProjectSourceInfo(projectId: string, userId: string) {
    const { project, document } = await getOwnedLiveStreamProject(projectId, userId);
    if (!document.sourceAssetId) {
      return { projectId: project.id, title: project.title, source: null };
    }

    const sourceAsset = getSourceAsset(project, document);
    const inputPath = resolveProjectAssetPath(project.id, sourceAsset.r2Key);
    await stat(inputPath).catch(() => {
      throw new Error('Source video sudah expired.');
    });

    const metadataDurationMs = getMetadataNumber(sourceAsset.metadata, 'durationMs');
    const metadataWidth = getMetadataNumber(sourceAsset.metadata, 'width');
    const metadataHeight = getMetadataNumber(sourceAsset.metadata, 'height');
    const metadataHasAudio = getMetadataBoolean(sourceAsset.metadata, 'hasAudio');

    const probedInfo =
      metadataDurationMs && metadataWidth && metadataHeight && metadataHasAudio !== null
        ? {
            durationMs: Math.round(metadataDurationMs),
            width: Math.round(metadataWidth),
            height: Math.round(metadataHeight),
            hasAudio: metadataHasAudio,
          }
        : await resolveVideoInfo(inputPath);

    return {
      projectId: project.id,
      title: project.title,
      source: {
        assetId: sourceAsset.id,
        assetName: sourceAsset.name,
        sourceUrl: sourceAsset.sourceUrl,
        ...probedInfo,
      },
    };
  },

  async finalizeStream(input: FinalizeStreamInput): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const now = new Date();
      const existing = await tx.streamSession.findFirst({
        where: { id: input.streamId, userId: input.userId },
      });

      if (!existing || existing.durationMinutesBilled !== null) {
        return;
      }

      const seconds = Math.max(0, (now.getTime() - existing.startedAt.getTime()) / 1000);
      const minutesBilled = Math.ceil(seconds / 60);

      await tx.streamSession.update({
        where: { id: input.streamId },
        data: {
          status: input.status,
          endedAt: now,
          durationMinutesBilled: minutesBilled,
          stopReason: input.reason,
          errorMessage: input.errorMessage,
        },
      });

      if (existing.quotaCycleId && minutesBilled > 0) {
        await tx.streamQuotaCycle.update({
          where: { id: existing.quotaCycleId },
          data: { quotaMinutesUsed: { increment: minutesBilled } },
        });
      }
    });

    logger.info(
      { streamId: input.streamId, reason: input.reason, status: input.status },
      'Stream finalized',
    );
  },

  /**
   * Stop an active stream.
   */
  async stopStream(
    streamId: string,
    userId: string,
    reason: StreamStopReasonInput = 'USER_REQUEST',
  ): Promise<void> {
    const stream = await prisma.streamSession.findFirst({
      where: { id: streamId, userId },
    });

    if (!stream) throw new Error('Stream not found');

    await prisma.streamSession.update({
      where: { id: streamId },
      data: { status: 'STOPPING' },
    });

    requestStreamProcessStop(streamId, userId);

    await this.finalizeStream({
      streamId,
      userId,
      status: reason === 'ERROR' || reason === 'PROCESS_LOST' ? 'FAILED' : 'ENDED',
      reason,
    });
  },

  /**
   * Get stream status.
   */
  async getStreamStatus(streamId: string, userId: string) {
    const stream = await prisma.streamSession.findFirst({
      where: { id: streamId, userId },
    });

    if (!stream) throw new Error('Stream not found');

    return toPublicStreamSession(stream, {
      isActive:
        ['STARTING', 'LIVE', 'STOPPING'].includes(stream.status) && isStreamActive(streamId),
    });
  },

  /**
   * Get user's stream history.
   */
  async getHistory(userId: string, options: { limit?: number; cursor?: string } = {}) {
    const limit = Math.min(Math.max(options.limit ?? 20, 1), 50);
    const cursor = parseHistoryCursor(options.cursor);
    const streams = await prisma.streamSession.findMany({
      where: {
        userId,
        ...(cursor
          ? {
              OR: [
                { startedAt: { lt: cursor.startedAt } },
                { startedAt: cursor.startedAt, id: { lt: cursor.id } },
              ],
            }
          : {}),
      },
      orderBy: [{ startedAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    });

    const page = streams.slice(0, limit);
    const next = streams.length > limit ? page.at(-1) : null;
    return {
      streams: page.map((stream) =>
        toPublicStreamSession(stream, {
          isActive:
            ['STARTING', 'LIVE', 'STOPPING'].includes(stream.status) && isStreamActive(stream.id),
        }),
      ),
      nextCursor: next ? createHistoryCursor(next) : null,
    };
  },

  /**
   * Get active streams for user.
   */
  async getActiveStreams(userId: string) {
    const streams = await prisma.streamSession.findMany({
      where: { userId, status: { in: ['STARTING', 'LIVE', 'STOPPING'] } },
      orderBy: { startedAt: 'desc' },
    });
    return streams.map((stream) =>
      toPublicStreamSession(stream, {
        isActive: isStreamActive(stream.id),
      }),
    );
  },

  async reconcileRuntimeState(): Promise<void> {
    const activeStreams = await prisma.streamSession.findMany({
      where: {
        status: { in: ['STARTING', 'LIVE', 'STOPPING'] },
        durationMinutesBilled: null,
      },
      select: { id: true, userId: true },
    });

    for (const stream of activeStreams) {
      if (!isStreamActive(stream.id)) {
        await this.finalizeStream({
          streamId: stream.id,
          userId: stream.userId,
          status: 'FAILED',
          reason: 'PROCESS_LOST',
          errorMessage: 'Stream process tidak lagi berjalan di server.',
        });
      }
    }
  },
};

// Register stop handler with reaper and start it.
setStopStreamHandler(streamService.stopStream.bind(streamService));
streamService
  .reconcileRuntimeState()
  .catch((error: Error) => logger.error({ error: error.message }, 'Stream reconcile failed'));
startStreamReaper();
