import { existsSync } from 'node:fs';
import type { ExportHistory, ExportResolution, SubscriptionTier } from '@prisma/client';
import { env } from '@/config/env';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { addExportJob, getExportQueueStats } from './export.queue';
import { createExportDisplayFilename, createExportFingerprint } from './export-cache';
import { cancelExportJob } from './export-cancel';

interface TimelineData {
  clips: Array<{
    localPath: string;
    mediaType?: 'video' | 'image';
    startTime: number;
    endTime: number;
    transforms?: {
      x: number;
      y: number;
      scale: number;
      rotation: number;
      opacity: number;
    };
    effects?: {
      filters: string[];
      speed: number;
      volume: number;
      fadeIn: number;
      fadeOut: number;
      transitionIn?: 'none' | 'fade' | 'slide-left' | 'slide-right' | 'zoom';
      transitionOut?: 'none' | 'fade' | 'slide-left' | 'slide-right' | 'zoom';
      motion?: 'none' | 'zoom-in' | 'zoom-out';
    };
  }>;
  textOverlays?: Array<{
    id: string;
    content: string;
    startMs: number;
    endMs: number;
    x: number;
    y: number;
    fontSize: number;
    fontFamily: string;
    fontWeight?: string;
    color: string;
    backgroundColor?: string;
    animation?: 'none' | 'fade' | 'slide-up' | 'slide-down' | 'typewriter';
    animationIn?: 'none' | 'fade' | 'slide-up' | 'slide-down' | 'pop' | 'zoom' | 'typewriter';
    animationOut?: 'none' | 'fade-out' | 'slide-out' | 'shrink';
    animationLoop?: 'none' | 'pulse' | 'shake' | 'glow';
  }>;
  audioTracks?: Array<{
    localPath: string;
    startTime: number;
    endTime: number;
    timelineStartMs: number;
    timelineEndMs: number;
    volume: number;
    fadeInMs: number;
    fadeOutMs: number;
  }>;
  settings: {
    width: number;
    height: number;
    fps: number;
    backgroundColor?: string;
    backgroundMode?: 'solid' | 'blur';
    backgroundBlurAmount?: number;
    backgroundBlurZoom?: number;
    backgroundDim?: number;
    backgroundSaturation?: number;
  };
}

interface CreateExportJobInput {
  userId: string;
  projectId?: string | null;
  timelineData: TimelineData;
  fingerprintTimelineData?: TimelineData;
  format?: 'MP4' | 'WEBM' | 'MOV';
  resolution?: 'SD' | 'HD' | 'UHD';
  addWatermark?: boolean;
  consumeQuotaOnSuccess?: boolean;
  pendingLimit?: number;
  requestId: string;
  quotaAllowed?: boolean;
}

type ExportCacheState = 'none' | 'active-job' | 'completed-result';

interface CreateExportJobResult {
  job: ExportHistory;
  reused: boolean;
  cacheState: ExportCacheState;
}

export class ExportServiceError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly statusCode = 400,
  ) {
    super(message);
    this.name = 'ExportServiceError';
  }
}

const EXPORT_RESULT_TTL_MS = 48 * 60 * 60 * 1000;
const DEFAULT_PENDING_LIMIT = 1;

/**
 * Export service for handling video export jobs
 */
export const exportService = {
  async createJob(input: CreateExportJobInput): Promise<CreateExportJobResult> {
    const {
      userId,
      projectId,
      timelineData,
      fingerprintTimelineData,
      format = 'MP4',
      resolution = 'HD',
      addWatermark = true,
      consumeQuotaOnSuccess = false,
      pendingLimit = DEFAULT_PENDING_LIMIT,
      requestId,
      quotaAllowed = true,
    } = input;
    const persistedProjectId = projectId && projectId !== 'default' ? projectId : undefined;
    const exportFingerprint = createExportFingerprint({
      projectId: persistedProjectId,
      format,
      resolution,
      addWatermark,
      timelineData: fingerprintTimelineData ?? timelineData,
    });

    const activeReusableJob = await prisma.exportHistory.findFirst({
      where: {
        userId,
        exportFingerprint,
        status: { in: ['QUEUED', 'PROCESSING'] },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (activeReusableJob) {
      return { job: activeReusableJob, reused: true, cacheState: 'active-job' };
    }

    const completedReusableJob = await prisma.exportHistory.findFirst({
      where: {
        userId,
        exportFingerprint,
        status: 'COMPLETED',
        urlExpiresAt: { gt: new Date() },
        localPath: { not: null },
      },
      orderBy: { completedAt: 'desc' },
    });

    if (
      completedReusableJob?.localPath &&
      existsSync(completedReusableJob.localPath) &&
      completedReusableJob.downloadUrl
    ) {
      return { job: completedReusableJob, reused: true, cacheState: 'completed-result' };
    }

    if (!quotaAllowed) {
      throw new ExportServiceError(
        'Export quota exceeded. Please upgrade your plan.',
        'QUOTA_EXCEEDED',
        403,
      );
    }

    const pendingJobs = await prisma.exportHistory.count({
      where: {
        userId,
        status: { in: ['QUEUED', 'PROCESSING'] },
      },
    });

    if (pendingJobs >= pendingLimit) {
      throw new ExportServiceError(
        'Kamu masih punya export yang sedang berjalan. Tunggu selesai dulu sebelum export lagi.',
        'EXPORT_TOO_MANY_PENDING',
        429,
      );
    }

    const queueStats = await getExportQueueStats();
    if (queueStats.waiting + queueStats.active >= env.EXPORT_QUEUE_MAX_PENDING) {
      throw new ExportServiceError(
        'Antrian export sedang penuh. Coba lagi beberapa menit lagi.',
        'EXPORT_QUEUE_FULL',
        503,
      );
    }

    const now = new Date();
    const displayFilename = await createDisplayFilenameForProject(userId, persistedProjectId, now);

    const job = await prisma.exportHistory.create({
      data: {
        userId,
        projectId: persistedProjectId,
        format,
        resolution: resolution as ExportResolution,
        status: 'QUEUED',
        phase: 'QUEUED',
        progress: 0,
        timelineData: JSON.parse(JSON.stringify(timelineData)),
        expiresAt: new Date(now.getTime() + EXPORT_RESULT_TTL_MS),
        exportFingerprint,
        displayFilename,
        addWatermark,
        consumeQuotaOnSuccess,
      },
    });

    try {
      await addExportJob({ jobId: job.id, userId, requestId });
    } catch (err) {
      await prisma.exportHistory.update({
        where: { id: job.id },
        data: {
          status: 'FAILED',
          phase: 'FAILED',
          errorMessage: 'Export queue unavailable',
        },
      });
      logger.error({ err, jobId: job.id, requestId }, 'Failed to enqueue export job');
      throw new ExportServiceError(
        'Service export sedang sibuk. Coba lagi beberapa saat lagi.',
        'EXPORT_QUEUE_FULL',
        503,
      );
    }

    return { job, reused: false, cacheState: 'none' };
  },

  async getOwnedJob(jobId: string, userId: string) {
    const job = await prisma.exportHistory.findFirst({
      where: {
        id: jobId,
        userId,
      },
    });

    if (!job) {
      throw new Error('Export job not found');
    }

    return job;
  },

  async getJobStatus(jobId: string, userId: string) {
    const job = await this.getOwnedJob(jobId, userId);

    return {
      id: job.id,
      status: job.status,
      progress: job.progress,
      phase: job.phase,
      errorMessage: job.errorMessage,
      downloadUrl: job.downloadUrl,
      urlExpiresAt: job.urlExpiresAt,
      completedAt: job.completedAt,
      filename: job.displayFilename ?? undefined,
      cacheState: job.reusedFromJobId ? 'completed-result' : 'none',
    };
  },

  async cancelJob(jobId: string, userId: string) {
    const result = await cancelExportJob(jobId, userId);

    if (!result.success && result.status === 'NOT_FOUND') {
      throw new Error('Export job not found');
    }

    if (!result.success && result.status === 'ALREADY_COMPLETED') {
      throw new Error('Cannot cancel completed job');
    }

    return {
      success: result.success,
      previousStatus: result.status,
      message: result.message,
    };
  },

  async getHistory(userId: string, limit = 10, cursor?: string) {
    let cursorWhere = {};

    if (cursor) {
      try {
        const decoded = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as {
          id: string;
          ts: string;
        };
        const cursorDate = new Date(decoded.ts);
        cursorWhere = {
          OR: [
            { createdAt: { lt: cursorDate } },
            { createdAt: cursorDate, id: { lt: decoded.id } },
          ],
        };
      } catch {
        // Invalid cursor, ignore
      }
    }

    const [jobs, total] = await Promise.all([
      prisma.exportHistory.findMany({
        where: { userId, ...cursorWhere },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: limit + 1,
      }),
      prisma.exportHistory.count({
        where: { userId },
      }),
    ]);

    const hasMore = jobs.length > limit;
    const items = hasMore ? jobs.slice(0, limit) : jobs;
    const lastItem = items[items.length - 1];
    const nextCursor =
      hasMore && lastItem
        ? Buffer.from(
            JSON.stringify({
              id: lastItem.id,
              ts: lastItem.createdAt.toISOString(),
            }),
          ).toString('base64url')
        : null;

    return {
      items: items.map((job) => ({
        id: job.id,
        status: job.status,
        format: job.format,
        resolution: job.resolution,
        progress: job.progress,
        phase: job.phase,
        errorMessage: job.errorMessage,
        downloadUrl: job.downloadUrl,
        urlExpiresAt: job.urlExpiresAt,
        completedAt: job.completedAt,
        createdAt: job.createdAt,
        fileSizeBytes: job.fileSizeBytes?.toString(),
        projectId: job.projectId,
        filename: job.displayFilename ?? undefined,
      })),
      nextCursor,
      hasMore,
      total,
    };
  },
};

export function getPendingExportLimit(tier: SubscriptionTier | 'ADMIN'): number {
  if (tier === 'ADMIN') return 5;
  if (tier === 'PRO') return 2;
  return 1;
}

async function createDisplayFilenameForProject(
  userId: string,
  projectId: string | undefined,
  createdAt: Date,
): Promise<string> {
  if (!projectId) {
    return createExportDisplayFilename({ createdAt });
  }

  const project = await prisma.project.findFirst({
    where: { id: projectId, userId, deletedAt: null },
    select: { title: true },
  });

  return createExportDisplayFilename({
    projectTitle: project?.title,
    createdAt,
  });
}
