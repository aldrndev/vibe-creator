import { createReadStream } from 'node:fs';
import { access, stat } from 'node:fs/promises';
import { basename, join } from 'node:path';
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { env } from '@/config/env';
import { normalizeDirectorExportOptions } from '@/modules/director/export-entitlement';
import {
  subtitleBackgroundColorTokenValues,
  subtitleFontFamilyValues,
  subtitleFontTokenValues,
  subtitleTextColorTokenValues,
} from '@/modules/director/subtitle-style-tokens';
import {
  assertDownloadAvailable,
  WorkspaceLifecycleError,
} from '@/modules/workspace/workspace-lifecycle';
import { requireAuth } from '@/plugins/auth';
import { contentModeValues } from '../content-mode';
import { directorService } from '../director.service';
import { buildLivePreviewUrls, isValidLivePreviewFilename } from '../export-preview-url';
import { buildDirectorFinalPreviewJobId, directorFinalPreviewQueue } from '../final-preview.queue';
import {
  DIRECTOR_SUBTITLE_FONT_SIZE_MAX,
  DIRECTOR_SUBTITLE_FONT_SIZE_MIN,
} from '../processing/video-export-subtitles';

const startExportSchema = z.object({
  aspectRatio: z.enum(['9:16', '16:9', '1:1']).optional(),
  quality: z.enum(['720p', '1080p']).optional(),
  includeSubtitles: z.boolean().optional(),
  normalizeAudio: z.boolean().optional(),
  refineSettings: z
    .record(
      z.string(),
      z.object({
        faceTracking: z.boolean().optional(),
        removeSilence: z.boolean().optional(),
        optimizeHook: z.boolean().optional(),
        stabilize: z.boolean().optional(),
        contentMode: z.enum(contentModeValues).optional(),
      }),
    )
    .optional(),
});

const subtitlePositionValues = ['top', 'center', 'bottom'] as const;
const subtitleStylePresetValues = [
  'custom',
  'viral-pop',
  'meme-pop',
  'podcast-duo',
  'clean-bold',
  'neon-glow',
  'creator-box',
  'cinema',
] as const;

const subtitleAnimationValues = [
  'none',
  'fade',
  'typewriter',
  'word',
  'pop-word',
  'phrase',
  'line',
] as const;

const subtitleSpeakerModeValues = ['single', 'speaker-colors'] as const;

const previewSpeakerStyleSchema = z.object({
  speaker: z.string().trim().min(1).max(64),
  label: z.string().trim().min(1).max(32),
  textColorToken: z.enum(subtitleTextColorTokenValues),
  bgColorToken: z.enum(subtitleBackgroundColorTokenValues).optional(),
});

const previewSubtitleStyleSchema = z.object({
  stylePreset: z.enum(subtitleStylePresetValues).optional(),
  fontToken: z.enum(subtitleFontTokenValues).optional(),
  fontFamily: z.enum(subtitleFontFamilyValues).optional(),
  textColorToken: z.enum(subtitleTextColorTokenValues).optional(),
  bgColorToken: z.enum(subtitleBackgroundColorTokenValues).optional(),
  fontSize: z
    .number()
    .min(DIRECTOR_SUBTITLE_FONT_SIZE_MIN)
    .max(DIRECTOR_SUBTITLE_FONT_SIZE_MAX)
    .optional(),
  position: z.enum(subtitlePositionValues).optional(),
  animation: z.enum(subtitleAnimationValues).optional(),
  speakerMode: z.enum(subtitleSpeakerModeValues).optional(),
  speakerStyles: z.array(previewSpeakerStyleSchema).max(8).optional(),
});

const previewExportSchema = startExportSchema.extend({
  subtitleStyle: previewSubtitleStyleSchema.optional(),
});

const previewStatusQuerySchema = z.object({
  previewFileName: z.string().refine(isValidLivePreviewFilename, 'Invalid preview filename'),
});

type FinalPreviewStatus = 'READY' | 'QUEUED' | 'PROCESSING' | 'FAILED';

interface FinalPreviewReadyData {
  status: 'READY';
  progress: 100;
  previewFileName: string;
  previewUrl: string;
  downloadUrl: string;
}

interface FinalPreviewPendingData {
  status: 'QUEUED' | 'PROCESSING';
  progress?: number;
  previewFileName: string;
}

type FinalPreviewSuccessData = FinalPreviewReadyData | FinalPreviewPendingData;

interface ByteRange {
  readonly start: number;
  readonly end: number;
  readonly length: number;
}

type FinalPreviewStatusResponse =
  | {
      statusCode: 200 | 202;
      body: {
        success: true;
        data: FinalPreviewSuccessData;
      };
    }
  | {
      statusCode: 500;
      body: {
        success: false;
        error: {
          code: 'PREVIEW_FAILED';
          message: string;
        };
      };
    };

function clampProgress(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(value)));
}

function getProgressFromQueue(raw: unknown): number | undefined {
  if (typeof raw === 'number') {
    return clampProgress(raw);
  }

  if (
    raw &&
    typeof raw === 'object' &&
    'percent' in raw &&
    typeof (raw as { percent?: unknown }).percent === 'number'
  ) {
    return clampProgress((raw as { percent: number }).percent);
  }

  return undefined;
}

function parseRangeNumber(value: string): number | null {
  if (!/^\d+$/.test(value)) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

export function resolveLivePreviewByteRange(
  rangeHeader: string | undefined,
  fileSize: number,
): ByteRange | null {
  if (!rangeHeader) {
    return null;
  }

  if (!rangeHeader.startsWith('bytes=') || rangeHeader.includes(',')) {
    return null;
  }

  const [rawStart = '', rawEnd = ''] = rangeHeader.slice('bytes='.length).split('-', 2);
  if (!rawStart && !rawEnd) {
    return null;
  }

  if (!rawStart) {
    const suffixLength = parseRangeNumber(rawEnd);
    if (!suffixLength || suffixLength <= 0) {
      return null;
    }

    const start = Math.max(fileSize - suffixLength, 0);
    const end = fileSize - 1;
    return { start, end, length: end - start + 1 };
  }

  const start = parseRangeNumber(rawStart);
  const requestedEnd = rawEnd ? parseRangeNumber(rawEnd) : fileSize - 1;
  if (start === null || requestedEnd === null || start >= fileSize || requestedEnd < start) {
    return null;
  }

  const end = Math.min(requestedEnd, fileSize - 1);
  return { start, end, length: end - start + 1 };
}

function getRangeHeader(request: FastifyRequest): string | undefined {
  const rangeHeader = request.headers.range;
  return typeof rangeHeader === 'string' ? rangeHeader : undefined;
}

function sendInvalidRange(reply: FastifyReply, fileSize: number): FastifyReply {
  return reply
    .status(416)
    .header('Accept-Ranges', 'bytes')
    .header('Content-Range', `bytes */${fileSize}`)
    .send();
}

async function sendPreviewVideoFile(
  request: FastifyRequest,
  reply: FastifyReply,
  filePath: string,
): Promise<FastifyReply> {
  const fileStats = await stat(filePath);
  const fileSize = fileStats.size;
  const rangeHeader = getRangeHeader(request);
  const byteRange = resolveLivePreviewByteRange(rangeHeader, fileSize);

  if (rangeHeader && !byteRange) {
    return sendInvalidRange(reply, fileSize);
  }

  if (byteRange) {
    return reply
      .status(206)
      .type('video/mp4')
      .header('Accept-Ranges', 'bytes')
      .header('Content-Length', byteRange.length)
      .header('Content-Range', `bytes ${byteRange.start}-${byteRange.end}/${fileSize}`)
      .header('Cache-Control', 'private, max-age=600')
      .header('X-Content-Type-Options', 'nosniff')
      .send(createReadStream(filePath, { start: byteRange.start, end: byteRange.end }));
  }

  return reply
    .type('video/mp4')
    .header('Accept-Ranges', 'bytes')
    .header('Content-Length', fileSize)
    .header('Cache-Control', 'private, max-age=600')
    .header('X-Content-Type-Options', 'nosniff')
    .send(createReadStream(filePath));
}

function mapQueueStateToPreviewStatus(state: string): FinalPreviewStatus {
  if (state === 'active') {
    return 'PROCESSING';
  }

  if (state === 'failed') {
    return 'FAILED';
  }

  if (state === 'completed') {
    return 'READY';
  }

  return 'QUEUED';
}

async function getFinalPreviewQueueStatus(jobId: string): Promise<{
  status: FinalPreviewStatus;
  progress?: number;
}> {
  const job = await directorFinalPreviewQueue.getJob(jobId);
  if (!job) {
    return { status: 'FAILED' };
  }

  const state = await job.getState();
  return {
    status: mapQueueStateToPreviewStatus(state),
    progress: getProgressFromQueue(job.progress),
  };
}

function buildFinalPreviewReadyData(
  sessionId: string,
  previewFileName: string,
): FinalPreviewReadyData {
  const { previewUrl, downloadUrl } = buildLivePreviewUrls(sessionId, previewFileName);
  return {
    status: 'READY',
    progress: 100,
    previewFileName,
    previewUrl,
    downloadUrl,
  };
}

function buildFinalPreviewFailedResponse(): FinalPreviewStatusResponse {
  return {
    statusCode: 500,
    body: {
      success: false,
      error: { code: 'PREVIEW_FAILED', message: 'Preview belum dapat dibuat' },
    },
  };
}

async function finalPreviewFileExists(previewFileName: string): Promise<boolean> {
  const filePath = join(env.MEDIA_INPUT_DIR, 'director', 'live-previews', previewFileName);
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function resolveFinalPreviewStatusResponse(
  sessionId: string,
  previewFileName: string,
): Promise<FinalPreviewStatusResponse> {
  if (await finalPreviewFileExists(previewFileName)) {
    return {
      statusCode: 200,
      body: {
        success: true,
        data: buildFinalPreviewReadyData(sessionId, previewFileName),
      },
    };
  }

  const jobId = buildDirectorFinalPreviewJobId(sessionId, previewFileName);
  const status = await getFinalPreviewQueueStatus(jobId);
  if (status.status === 'FAILED' || status.status === 'READY') {
    return buildFinalPreviewFailedResponse();
  }

  return {
    statusCode: 202,
    body: {
      success: true,
      data: {
        status: status.status,
        progress: status.progress,
        previewFileName,
      },
    },
  };
}

async function enqueueOrReuseFinalPreviewJob(
  sessionId: string,
  userId: string,
  previewFileName: string,
  options: z.infer<typeof previewExportSchema>,
): Promise<FinalPreviewStatusResponse> {
  const jobId = buildDirectorFinalPreviewJobId(sessionId, previewFileName);
  const existingJob = await directorFinalPreviewQueue.getJob(jobId);
  const existingJobState = existingJob ? await existingJob.getState() : null;
  const shouldReplaceJob = existingJobState === 'completed' || existingJobState === 'failed';

  if (existingJob && shouldReplaceJob) {
    await existingJob.remove().catch(() => {});
  }

  if (!existingJob || shouldReplaceJob) {
    await directorFinalPreviewQueue.add(
      'final-preview',
      {
        type: 'FINAL_PREVIEW',
        sessionId,
        userId,
        previewFileName,
        options,
      },
      { jobId },
    );
  }

  return resolveFinalPreviewStatusResponse(sessionId, previewFileName);
}

export const exportRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * Start export
   */
  fastify.post<{ Params: { id: string } }>(
    '/sessions/:id/export',
    {
      preHandler: [requireAuth],
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const user = request.user;
      if (!user) {
        return reply.status(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      try {
        const body = startExportSchema.parse(request.body);
        const effectiveBody = await normalizeDirectorExportOptions(user, body);
        const job = await directorService.startExport(request.params.id, user.id, effectiveBody);
        return reply.status(202).send({
          success: true,
          data: job,
        });
      } catch (err) {
        if (err instanceof z.ZodError) {
          return reply.status(400).send({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: err.issues[0]?.message,
            },
          });
        }
        const message = err instanceof Error ? err.message : 'Export failed';
        if (err instanceof WorkspaceLifecycleError) {
          return reply.status(err.statusCode).send({
            success: false,
            error: { code: err.code, message: err.message },
          });
        }
        return reply.status(400).send({
          success: false,
          error: { code: 'EXPORT_FAILED', message },
        });
      }
    },
  );

  /**
   * Get export status
   */
  fastify.get<{ Params: { id: string } }>(
    '/sessions/:id/export',
    {
      preHandler: [requireAuth],
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const user = request.user;
      if (!user) {
        return reply.status(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      try {
        const result = await directorService.getExportResult(request.params.id, user.id);
        return reply.send({
          success: true,
          data: result,
        });
      } catch (error) {
        if (error instanceof WorkspaceLifecycleError) {
          return reply.status(error.statusCode).send({
            success: false,
            error: { code: error.code, message: error.message },
          });
        }
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Export not found' },
        });
      }
    },
  );

  fastify.get<{ Params: { id: string }; Querystring: { previewFileName?: string } }>(
    '/sessions/:id/export/preview/status',
    {
      preHandler: [requireAuth],
    },
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Querystring: { previewFileName?: string };
      }>,
      reply: FastifyReply,
    ) => {
      const user = request.user;
      if (!user) {
        return reply.status(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      try {
        const { previewFileName } = previewStatusQuerySchema.parse(request.query);
        const session = await directorService.getSession(request.params.id, user.id);
        if (!session) {
          return reply.status(404).send({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Session not found' },
          });
        }

        const response = await resolveFinalPreviewStatusResponse(
          request.params.id,
          previewFileName,
        );
        return reply.status(response.statusCode).send(response.body);
      } catch (err) {
        if (err instanceof z.ZodError) {
          return reply.status(400).send({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: err.issues[0]?.message,
            },
          });
        }
        if (err instanceof WorkspaceLifecycleError) {
          return reply.status(err.statusCode).send({
            success: false,
            error: { code: err.code, message: err.message },
          });
        }
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Preview not found' },
        });
      }
    },
  );

  fastify.get<{ Params: { id: string; filename: string } }>(
    '/sessions/:id/export/preview/:filename',
    {
      preHandler: [requireAuth],
    },
    async (
      request: FastifyRequest<{ Params: { id: string; filename: string } }>,
      reply: FastifyReply,
    ) => {
      const user = request.user;
      if (!user) {
        return reply.status(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      try {
        const { id: sessionId, filename } = request.params;

        if (!isValidLivePreviewFilename(filename)) {
          return reply.status(400).send({
            success: false,
            error: {
              code: 'INVALID_FILENAME',
              message: 'Invalid preview filename',
            },
          });
        }

        const session = await directorService.getSession(sessionId, user.id);
        if (!session) {
          return reply.status(404).send({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Session not found' },
          });
        }

        const filePath = join(env.MEDIA_INPUT_DIR, 'director', 'live-previews', filename);
        try {
          await access(filePath);
        } catch {
          return reply.status(404).send({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Preview file not found' },
          });
        }

        return sendPreviewVideoFile(request, reply, filePath);
      } catch (error) {
        if (error instanceof WorkspaceLifecycleError) {
          return reply.status(error.statusCode).send({
            success: false,
            error: { code: error.code, message: error.message },
          });
        }
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Preview not found' },
        });
      }
    },
  );

  fastify.get<{ Params: { id: string; filename: string } }>(
    '/sessions/:id/export/preview/:filename/download',
    {
      preHandler: [requireAuth],
    },
    async (
      request: FastifyRequest<{ Params: { id: string; filename: string } }>,
      reply: FastifyReply,
    ) => {
      const user = request.user;
      if (!user) {
        return reply.status(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      try {
        const { id: sessionId, filename } = request.params;

        if (!isValidLivePreviewFilename(filename)) {
          return reply.status(400).send({
            success: false,
            error: {
              code: 'INVALID_FILENAME',
              message: 'Invalid preview filename',
            },
          });
        }

        const session = await directorService.getSession(sessionId, user.id);
        if (!session) {
          return reply.status(404).send({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Session not found' },
          });
        }

        const filePath = join(env.MEDIA_INPUT_DIR, 'director', 'live-previews', filename);

        try {
          await access(filePath);
        } catch {
          return reply.status(404).send({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Preview file not found' },
          });
        }

        const fileStats = await stat(filePath);
        return reply
          .type('video/mp4')
          .header('Content-Disposition', `attachment; filename="${filename}"`)
          .header('Content-Length', fileStats.size)
          .header('X-Content-Type-Options', 'nosniff')
          .send(createReadStream(filePath));
      } catch (error) {
        if (error instanceof WorkspaceLifecycleError) {
          return reply.status(error.statusCode).send({
            success: false,
            error: { code: error.code, message: error.message },
          });
        }
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Preview not found' },
        });
      }
    },
  );

  fastify.post<{ Params: { id: string } }>(
    '/sessions/:id/export/preview',
    {
      preHandler: [requireAuth],
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const user = request.user;
      if (!user) {
        return reply.status(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      try {
        const body = previewExportSchema.parse(request.body);
        const effectiveBody = await normalizeDirectorExportOptions(user, body);
        const preview = await directorService.resolveFinalPreviewTarget(
          request.params.id,
          user.id,
          effectiveBody,
        );

        if (preview.cached) {
          return reply.status(200).send({
            success: true,
            data: buildFinalPreviewReadyData(request.params.id, preview.previewFileName),
          });
        }

        const response = await enqueueOrReuseFinalPreviewJob(
          request.params.id,
          user.id,
          preview.previewFileName,
          effectiveBody,
        );
        return reply.status(response.statusCode).send(response.body);
      } catch (err) {
        if (err instanceof z.ZodError) {
          return reply.status(400).send({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: err.issues[0]?.message,
            },
          });
        }
        if (err instanceof WorkspaceLifecycleError) {
          return reply.status(err.statusCode).send({
            success: false,
            error: { code: err.code, message: err.message },
          });
        }
        return reply.status(400).send({
          success: false,
          error: { code: 'PREVIEW_FAILED', message: 'Preview belum dapat dibuat' },
        });
      }
    },
  );

  fastify.get<{ Params: { id: string } }>(
    '/sessions/:id/export/download',
    {
      preHandler: [requireAuth],
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const user = request.user;
      if (!user) {
        return reply.status(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      try {
        const exportJob = await directorService.getExportResult(request.params.id, user.id);

        if (!exportJob.outputStorageKey) {
          return reply.status(404).send({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Export file not found' },
          });
        }
        assertDownloadAvailable(exportJob.downloadExpiresAt, exportJob.outputDeletedAt);

        const fileName = basename(exportJob.outputStorageKey);
        const filePath = join(env.MEDIA_INPUT_DIR, 'director', 'exports', fileName);

        try {
          await access(filePath);
        } catch {
          return reply.status(404).send({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Export file not found' },
          });
        }

        const fileStats = await stat(filePath);
        return reply
          .type('video/mp4')
          .header('Content-Disposition', `attachment; filename="${fileName}"`)
          .header('Content-Length', fileStats.size)
          .header('X-Content-Type-Options', 'nosniff')
          .send(createReadStream(filePath));
      } catch (error) {
        if (error instanceof WorkspaceLifecycleError) {
          return reply.status(error.statusCode).send({
            success: false,
            error: { code: error.code, message: error.message },
          });
        }
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Export not found' },
        });
      }
    },
  );
};
