import { createReadStream, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { resolveEditorFontFamily } from '@vibe-creator/shared';
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { env } from '@/config/env';
import { AuditAction, audit } from '@/lib/audit';
import { prisma } from '@/lib/prisma';
import { requireRateLimitReady } from '@/lib/rate-limit';
import { paymentService } from '@/modules/payment/payment.service';
import { materializeStudioAudioAsset } from '@/modules/video-studio/video-studio-assets.service';
import {
  ASSET_EXPIRED_CODE,
  assertWorkspaceActive,
  WorkspaceLifecycleError,
} from '@/modules/workspace/workspace-lifecycle';
import { isTempUploadToken, resolveTempUploadToken } from '@/utils/temp-upload';
import { ExportServiceError, exportService, getPendingExportLimit } from './export.service';
import {
  type ExportEvent,
  formatSseEvent,
  formatSseHeartbeat,
  getExportEventHeartbeatMs,
  subscribeToExportEvents,
} from './export-events';

const clipFilterSchema = z.enum([
  'grayscale',
  'sepia',
  'vintage',
  'cold',
  'warm',
  'high-contrast',
  'fade',
  'vivid',
]);

const visualTransitionSchema = z.enum(['none', 'fade', 'slide-left', 'slide-right', 'zoom']);
const visualMotionSchema = z.enum(['none', 'zoom-in', 'zoom-out']);
const modernTextAnimationSchema = z.enum(['none', 'fade', 'slide-up', 'slide-down', 'typewriter']);
const modernTextAnimationInSchema = z.enum([
  'none',
  'fade',
  'slide-up',
  'slide-down',
  'pop',
  'zoom',
  'typewriter',
]);
const modernTextAnimationOutSchema = z.enum(['none', 'fade-out', 'slide-out', 'shrink']);
const modernTextAnimationLoopSchema = z.enum(['none', 'pulse', 'shake', 'glow']);

const createExportSchema = z.object({
  projectId: z.string(),
  timelineData: z.object({
    clips: z.array(
      z.object({
        localPath: z.string(),
        layerId: z.string().optional(),
        mediaType: z.enum(['video', 'image']).optional().default('video'),
        startTime: z.number(),
        endTime: z.number(),
        timelineStartMs: z.number().optional(),
        timelineEndMs: z.number().optional(),
        zIndex: z.number().optional(),
        fit: z.enum(['contain', 'cover']).optional(),
        visible: z.boolean().optional().default(true),
        loop: z.boolean().optional().default(false),
        transforms: z
          .object({
            x: z.number(),
            y: z.number(),
            scale: z.number(),
            rotation: z.number(),
            opacity: z.number(),
          })
          .optional(),
        effects: z
          .object({
            filters: z.array(clipFilterSchema),
            speed: z.number(),
            volume: z.number(),
            fadeIn: z.number(),
            fadeOut: z.number(),
            transitionIn: visualTransitionSchema.optional().default('none'),
            transitionOut: visualTransitionSchema.optional().default('none'),
            motion: visualMotionSchema.optional().default('none'),
          })
          .optional(),
      }),
    ),
    textOverlays: z
      .array(
        z.object({
          id: z.string(),
          content: z.string(),
          startMs: z.number(),
          endMs: z.number(),
          x: z.number(),
          y: z.number(),
          fontSize: z.number(),
          fontFamily: z.string().transform((fontFamily) => resolveEditorFontFamily(fontFamily)),
          fontWeight: z.string().optional(),
          fontStyle: z.enum(['normal', 'italic']).optional().default('normal'),
          color: z.string(),
          backgroundColor: z.string().optional(),
          backgroundOpacity: z.number().min(0).max(1).optional(),
          zIndex: z.number().optional(),
          opacity: z.number().min(0).max(1).optional().default(1),
          rotation: z.number().optional().default(0),
          textAlign: z.enum(['left', 'center', 'right']).optional().default('center'),
          visible: z.boolean().optional().default(true),
          animation: modernTextAnimationSchema.optional().default('none'),
          animationIn: modernTextAnimationInSchema.optional(),
          animationOut: modernTextAnimationOutSchema.optional(),
          animationLoop: modernTextAnimationLoopSchema.optional(),
        }),
      )
      .optional(),
    audioTracks: z
      .array(
        z.object({
          localPath: z.string(),
          startTime: z.number(),
          endTime: z.number(),
          timelineStartMs: z.number(),
          timelineEndMs: z.number(),
          volume: z.number(),
          fadeInMs: z.number(),
          fadeOutMs: z.number(),
          loop: z.boolean().optional().default(false),
        }),
      )
      .optional(),
    settings: z.object({
      width: z.number().default(1920),
      height: z.number().default(1080),
      fps: z.number().default(30),
      backgroundColor: z.string().default('#000000'),
      backgroundMode: z.enum(['solid', 'blur', 'gradient', 'image']).default('solid'),
      backgroundOpacity: z.number().min(0).max(1).optional().default(1),
      backgroundBlurAmount: z.number().min(0).max(50).optional().default(18),
      backgroundBlurZoom: z.number().min(1).max(1.5).optional().default(1.08),
      backgroundDim: z.number().min(0).max(0.6).optional().default(0.08),
      backgroundSaturation: z.number().min(0).max(2).optional().default(1.05),
      backgroundGradientFrom: z
        .string()
        .regex(/^#[0-9A-Fa-f]{6}$/)
        .optional()
        .default('#111827'),
      backgroundGradientTo: z
        .string()
        .regex(/^#[0-9A-Fa-f]{6}$/)
        .optional()
        .default('#ff4b1f'),
      backgroundGradientAngle: z.number().min(0).max(360).optional().default(135),
      backgroundImagePath: z.string().optional(),
      backgroundImageFit: z.enum(['contain', 'cover']).optional().default('cover'),
      backgroundImageBlurAmount: z.number().min(0).max(40).optional().default(0),
      backgroundImageDim: z.number().min(0).max(0.6).optional().default(0),
      backgroundImagePositionX: z.number().min(0).max(100).optional().default(50),
      backgroundImagePositionY: z.number().min(0).max(100).optional().default(50),
      backgroundImageScale: z.number().min(1).max(2).optional().default(1),
    }),
  }),
  format: z.enum(['MP4', 'WEBM', 'MOV']).optional().default('MP4'),
  resolution: z.enum(['SD', 'HD', 'UHD']).optional().default('HD'),
  addWatermark: z.boolean().optional().default(true),
});

const PROJECT_ASSET_PREFIX = 'project-asset:';
const STUDIO_ASSET_PREFIX = 'studio-asset:';

async function resolveExportInputPath(
  localPath: string,
  userId: string,
  projectId: string,
): Promise<string> {
  if (isTempUploadToken(localPath)) {
    return resolveTempUploadToken(localPath);
  }

  if (localPath.startsWith(STUDIO_ASSET_PREFIX)) {
    return materializeStudioAudioAsset(localPath.slice(STUDIO_ASSET_PREFIX.length));
  }

  if (!localPath.startsWith(PROJECT_ASSET_PREFIX)) {
    return localPath;
  }

  const assetId = localPath.slice(PROJECT_ASSET_PREFIX.length);
  const asset = await prisma.projectAsset.findFirst({
    where: {
      id: assetId,
      projectId,
      project: { userId, deletedAt: null },
    },
    include: { project: true },
  });

  if (!asset) {
    throw new WorkspaceLifecycleError(
      ASSET_EXPIRED_CODE,
      'Media project sudah tidak tersedia untuk export.',
    );
  }

  assertWorkspaceActive(asset.project.lifecycleStatus, asset.project.expiresAt);
  return join(env.MEDIA_INPUT_DIR, 'projects', projectId, asset.r2Key.split('/').pop() ?? '');
}

export const exportRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', async (request, reply) => {
    const result = requireRateLimitReady(request, reply);
    if (result) {
      return result;
    }
  });
  // Rate limit config for export creation - max 10 per hour per user
  const exportRateLimit = {
    config: {
      rateLimit: {
        max: 10,
        timeWindow: '1 hour',
        keyGenerator: (request: {
          user?: { id: string } | null;
          auth?: { userId: string; tenantId: string } | null;
          ip: string;
          url?: string;
        }) => {
          const routeKey = request.url?.split('?')[0] || 'export';
          const tenantId = request.auth?.tenantId || request.user?.id;
          const userId = request.auth?.userId || request.user?.id;
          if (tenantId && userId) {
            return `export:${tenantId}:${userId}:${routeKey}`;
          }
          return `export:ip:${request.ip}:${routeKey}`;
        },
        errorResponseBuilder: () => ({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many export requests. Please try again later.',
          },
        }),
      },
    },
  };

  function handleExportJobError(err: unknown, reply: FastifyReply) {
    if (err instanceof z.ZodError) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: err.issues[0]?.message },
      });
    }

    const message = err instanceof Error ? err.message : 'Export failed';
    if (err instanceof ExportServiceError || err instanceof WorkspaceLifecycleError) {
      return reply.status(err.statusCode).send({
        success: false,
        error: { code: err.code, message },
      });
    }

    return reply.status(400).send({
      success: false,
      error: { code: 'EXPORT_ERROR', message },
    });
  }

  async function resolveNonAdminLimits(
    userId: string,
    baseWatermark: boolean,
    baseResolution: string,
  ) {
    const subscription = await paymentService.getSubscription(userId);
    const exportResult = await paymentService.checkExportQuota(userId);

    const quotaAllowed = exportResult.allowed;
    const remaining = exportResult.remaining === -1 ? -1 : Math.max(0, exportResult.remaining - 1);

    const shouldAddWatermark = subscription.tier === 'FREE' ? true : baseWatermark;
    const pendingLimit = getPendingExportLimit(subscription.tier);

    let maxResolution = baseResolution;
    if (subscription.tier === 'FREE' && maxResolution === 'UHD') {
      maxResolution = 'SD';
    } else if (subscription.tier === 'CREATOR' && maxResolution === 'UHD') {
      maxResolution = 'HD';
    }

    return {
      shouldAddWatermark,
      maxResolution: maxResolution as 'SD' | 'HD' | 'UHD',
      remaining,
      pendingLimit,
      quotaAllowed,
    };
  }

  async function resolveExportLimitsAndQuota(
    user: { id: string; role: string },
    body: z.infer<typeof createExportSchema>,
  ) {
    if (user.role === 'ADMIN') {
      return {
        isAdmin: true,
        shouldAddWatermark: body.addWatermark,
        maxResolution: body.resolution,
        remaining: -1,
        pendingLimit: getPendingExportLimit('ADMIN'),
        quotaAllowed: true,
      };
    }

    const limits = await resolveNonAdminLimits(user.id, body.addWatermark, body.resolution);
    return { isAdmin: false, ...limits };
  }

  async function normalizeTimelineDataPaths(
    userId: string,
    projectId: string,
    timelineData: z.infer<typeof createExportSchema>['timelineData'],
  ) {
    return {
      ...timelineData,
      clips: await Promise.all(
        timelineData.clips.map(async (clip) => ({
          ...clip,
          localPath: await resolveExportInputPath(clip.localPath, userId, projectId),
        })),
      ),
      audioTracks: timelineData.audioTracks
        ? await Promise.all(
            timelineData.audioTracks.map(async (track) => ({
              ...track,
              localPath: await resolveExportInputPath(track.localPath, userId, projectId),
            })),
          )
        : undefined,
      settings: {
        ...timelineData.settings,
        backgroundImagePath: timelineData.settings.backgroundImagePath
          ? await resolveExportInputPath(
              timelineData.settings.backgroundImagePath,
              userId,
              projectId,
            )
          : undefined,
      },
    };
  }

  /**
   * Create export job
   */
  fastify.post(
    '/request',
    exportRateLimit,
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user;
      if (!user) {
        return reply.status(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      try {
        const body = createExportSchema.parse(request.body);
        if (
          body.timelineData.settings.backgroundMode === 'image' &&
          !body.timelineData.settings.backgroundImagePath
        ) {
          return reply.status(400).send({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Background image is required for image background mode.',
            },
          });
        }

        const limits = await resolveExportLimitsAndQuota(user, body);
        const normalizedTimelineData = await normalizeTimelineDataPaths(
          user.id,
          body.projectId,
          body.timelineData,
        );

        const job = await exportService.createJob({
          userId: user.id,
          projectId: body.projectId,
          timelineData: normalizedTimelineData,
          fingerprintTimelineData: body.timelineData,
          format: body.format,
          resolution: limits.maxResolution,
          addWatermark: limits.shouldAddWatermark,
          consumeQuotaOnSuccess: !limits.isAdmin,
          pendingLimit: limits.pendingLimit,
          requestId: request.id,
          quotaAllowed: limits.quotaAllowed,
        });

        void audit({
          requestId: request.id,
          userId: user.id,
          tenantId: user.id,
          action: AuditAction.EXPORT_CREATED,
          resourceType: 'export',
          resourceId: job.job.id,
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'] ?? undefined,
          metadata: {
            projectId: body.projectId,
            format: body.format,
            resolution: limits.maxResolution,
            cacheState: job.cacheState,
          },
        });

        return reply.status(201).send({
          success: true,
          data: {
            jobId: job.job.id,
            status: job.job.status,
            progress: job.job.progress,
            reused: job.reused,
            cacheState: job.cacheState,
            downloadUrl: job.job.downloadUrl ?? undefined,
            filename: job.job.displayFilename ?? undefined,
            urlExpiresAt: job.job.urlExpiresAt ?? undefined,
            remaining: limits.remaining,
            watermarkApplied: limits.shouldAddWatermark,
            isAdmin: limits.isAdmin,
          },
        });
      } catch (err) {
        return handleExportJobError(err, reply);
      }
    },
  );

  /**
   * Get export job status
   */
  fastify.get<{ Params: { jobId: string } }>(
    '/:jobId/status',
    async (request: FastifyRequest<{ Params: { jobId: string } }>, reply: FastifyReply) => {
      const user = request.user;
      if (!user) {
        return reply.status(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      try {
        const status = await exportService.getJobStatus(request.params.jobId, user.id);

        return reply.send({
          success: true,
          data: status,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Status check failed';
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message },
        });
      }
    },
  );

  function checkExportStatusEndCondition(
    status: Awaited<ReturnType<typeof exportService.getJobStatus>>,
    writeEvent: (event: ExportEvent) => void,
  ): boolean {
    if (status.status === 'COMPLETED' && status.urlExpiresAt && status.urlExpiresAt < new Date()) {
      writeEvent({
        type: 'expired',
        jobId: status.id,
        errorMessage: 'File export sudah expired. Silakan export ulang project ini.',
      });
      return true;
    }

    if (status.status === 'COMPLETED' && status.downloadUrl && status.urlExpiresAt) {
      writeEvent({
        type: 'completed',
        jobId: status.id,
        progress: 100,
        downloadUrl: status.downloadUrl,
        filename: status.filename ?? `video-studio-${status.id}.mp4`,
        completedAt: status.completedAt?.toISOString() ?? new Date().toISOString(),
        urlExpiresAt: status.urlExpiresAt.toISOString(),
      });
      return true;
    }

    if (status.status === 'FAILED') {
      writeEvent({
        type: 'failed',
        jobId: status.id,
        errorMessage: status.errorMessage ?? 'Export failed',
      });
      return true;
    }

    return false;
  }

  /**
   * Stream export progress events.
   */
  fastify.get<{ Params: { jobId: string } }>(
    '/:jobId/events',
    async (request: FastifyRequest<{ Params: { jobId: string } }>, reply: FastifyReply) => {
      const user = request.user;
      if (!user) {
        return reply.status(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      let heartbeat: NodeJS.Timeout | null = null;
      let cleanupSubscription: (() => Promise<void>) | null = null;

      try {
        const status = await exportService.getJobStatus(request.params.jobId, user.id);

        reply.raw.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
          'X-Accel-Buffering': 'no',
        });
        reply.hijack();

        const closeStream = async () => {
          if (heartbeat) {
            clearInterval(heartbeat);
            heartbeat = null;
          }
          if (cleanupSubscription) {
            await cleanupSubscription();
            cleanupSubscription = null;
          }
          if (!reply.raw.destroyed) {
            reply.raw.end();
          }
        };

        const writeEvent = (event: ExportEvent) => {
          if (reply.raw.destroyed) {
            return;
          }
          reply.raw.write(formatSseEvent(event));
          if (event.type === 'completed' || event.type === 'failed' || event.type === 'expired') {
            void closeStream();
          }
        };

        writeEvent({
          type: 'snapshot',
          jobId: status.id,
          status: status.status,
          progress: status.progress,
          phase: status.phase,
        });

        if (checkExportStatusEndCondition(status, writeEvent)) {
          return;
        }

        cleanupSubscription = await subscribeToExportEvents(request.params.jobId, writeEvent);
        heartbeat = setInterval(() => {
          if (!reply.raw.destroyed) {
            reply.raw.write(formatSseHeartbeat());
          }
        }, getExportEventHeartbeatMs());

        request.raw.on('close', () => {
          void closeStream();
        });
      } catch (err) {
        if (!reply.sent) {
          const message = err instanceof Error ? err.message : 'Export event stream failed';
          return reply.status(404).send({
            success: false,
            error: { code: 'EXPORT_FORBIDDEN', message },
          });
        }
      }
    },
  );

  /**
   * Download exported video
   */
  fastify.get<{ Params: { jobId: string } }>(
    '/:jobId/download',
    async (request: FastifyRequest<{ Params: { jobId: string } }>, reply: FastifyReply) => {
      const user = request.user;
      if (!user) {
        return reply.status(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      try {
        const job = await exportService.getOwnedJob(request.params.jobId, user.id);

        const downloadError = checkExportDownloadError(job);
        if (downloadError) {
          return reply.status(downloadError.status).send({
            success: false,
            error: { code: downloadError.code, message: downloadError.message },
          });
        }

        if (!job.localPath) {
          throw new Error('Local path is not defined for a completed job.');
        }

        const stat = statSync(job.localPath);
        const stream = createReadStream(job.localPath);

        return reply
          .header('Content-Type', 'video/mp4')
          .header(
            'Content-Disposition',
            `attachment; filename="${job.displayFilename ?? `video-studio-${request.params.jobId}.mp4`}"`,
          )
          .header('Content-Length', stat.size)
          .send(stream);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Download failed';
        return reply.status(500).send({
          success: false,
          error: { code: 'DOWNLOAD_ERROR', message },
        });
      }
    },
  );

  function checkExportDownloadError(job: Awaited<ReturnType<typeof exportService.getOwnedJob>>) {
    if (job.status !== 'COMPLETED' || !job.localPath) {
      return {
        status: 400,
        code: 'EXPORT_NOT_READY',
        message: 'Export belum selesai diproses.',
      };
    }

    if (job.urlExpiresAt && job.urlExpiresAt < new Date()) {
      return {
        status: 410,
        code: 'EXPORT_EXPIRED',
        message: 'File export sudah expired. Silakan export ulang project ini.',
      };
    }

    if (!existsSync(job.localPath)) {
      return {
        status: 404,
        code: 'EXPORT_EXPIRED',
        message: 'File export sudah tidak tersedia. Silakan export ulang project ini.',
      };
    }

    return null;
  }

  /**
   * Cancel an export job
   */
  fastify.post<{ Params: { jobId: string } }>(
    '/:jobId/cancel',
    async (request: FastifyRequest<{ Params: { jobId: string } }>, reply: FastifyReply) => {
      const user = request.user;
      if (!user) {
        return reply.status(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      try {
        const result = await exportService.cancelJob(request.params.jobId, user.id);

        return reply.send({
          success: true,
          data: result,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Cancel failed';
        return reply.status(400).send({
          success: false,
          error: { code: 'CANCEL_ERROR', message },
        });
      }
    },
  );

  /**
   * Get user's export history with cursor pagination
   */
  fastify.get('/history', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user;
    if (!user) {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    const query = request.query as { limit?: string; cursor?: string };
    const limit = Math.min(Number.parseInt(query.limit || '10', 10), 100);

    const result = await exportService.getHistory(user.id, limit, query.cursor);

    return reply.send({
      success: true,
      data: result,
    });
  });
};
