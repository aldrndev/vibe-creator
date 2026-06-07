import { createReadStream } from 'node:fs';
import { access, mkdir, stat } from 'node:fs/promises';
import { basename, join } from 'node:path';
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { env } from '@/config/env';
import { logger } from '@/lib/logger';
import { requireAuth } from '@/plugins/auth';
import { resolveClipDurationConfig } from '../analysis-duration-config';
import { getClipPosterCacheFileName, getClipPreviewCacheFileName } from '../clip-media-cache';
import { directorClipPreviewQueue } from '../clip-preview.queue';
import { directorProcessor } from '../director.processor';
import { buildDirectorQueueJobId } from '../director.queue';
import { directorRepo } from '../director.repo';
import { canAccessPreviewFile } from '../preview-access';
import { directorAnalysisReuseService } from '../services/analysis-reuse.service';

const PREVIEW_DIR = join(env.MEDIA_INPUT_DIR, 'director', 'previews');
const CLIP_PREVIEW_DIR = join(env.MEDIA_INPUT_DIR, 'director', 'clip-previews');

interface MediaCandidate {
  readonly id: string;
  readonly startMs: number;
  readonly endMs: number;
  readonly previewStorageKey?: string | null;
}

async function findClipCandidate(sessionId: string, userId: string, clipId: string) {
  const session = await directorRepo.findSession(sessionId, userId);
  if (!session?.asset?.storageKey) {
    return null;
  }

  const resolvedConfig = resolveClipDurationConfig(session.analysisJob?.config);
  const reusableCandidates =
    (await directorAnalysisReuseService.getReusableCandidates(
      session.asset,
      resolvedConfig.targetDurationRange,
    )) ?? [];
  const candidate = [
    ...(session.analysisJob?.candidates ?? []),
    ...session.selectedClips.map((clip) => clip.candidate),
    ...reusableCandidates,
  ].find((item) => item.id === clipId);

  if (!candidate) {
    return null;
  }

  return {
    session,
    candidate: candidate as MediaCandidate,
  };
}

async function serveFile(reply: FastifyReply, filePath: string, contentType: string) {
  const fileStats = await stat(filePath);
  return reply
    .type(contentType)
    .header('Content-Length', fileStats.size)
    .header('Cache-Control', 'private, max-age=600')
    .header('X-Content-Type-Options', 'nosniff')
    .send(createReadStream(filePath));
}

async function serveFileWithRange(
  request: FastifyRequest,
  reply: FastifyReply,
  filePath: string,
  contentType: string,
) {
  const fileStats = await stat(filePath);
  const rangeHeader = request.headers.range;
  if (!rangeHeader) {
    return serveFile(reply, filePath, contentType);
  }

  const match = /^bytes=(\d+)-(\d*)$/.exec(rangeHeader);
  if (!match) {
    return reply.status(416).header('Content-Range', `bytes */${fileStats.size}`).send();
  }

  const start = Number.parseInt(match[1] ?? '0', 10);
  const explicitEnd = match[2] ? Number.parseInt(match[2], 10) : fileStats.size - 1;
  const end = Math.min(explicitEnd, fileStats.size - 1);
  if (!Number.isFinite(start) || start < 0 || start > end || end >= fileStats.size) {
    return reply.status(416).header('Content-Range', `bytes */${fileStats.size}`).send();
  }

  return reply
    .status(206)
    .type(contentType)
    .header('Content-Length', end - start + 1)
    .header('Content-Range', `bytes ${start}-${end}/${fileStats.size}`)
    .header('Accept-Ranges', 'bytes')
    .header('Cache-Control', 'private, max-age=600')
    .header('X-Content-Type-Options', 'nosniff')
    .send(createReadStream(filePath, { start, end }));
}

function buildPreviewJobId(sessionId: string, clipId: string, previewFileName: string): string {
  return buildDirectorQueueJobId('director-clip-preview', sessionId, clipId, previewFileName);
}

async function resolveClipPreviewMedia(params: {
  sessionId: string;
  userId: string;
  clipId: string;
}) {
  const clipMedia = await findClipCandidate(params.sessionId, params.userId, params.clipId);
  if (!clipMedia) {
    return null;
  }

  const { session, candidate } = clipMedia;
  const asset = session.asset;
  if (!asset?.storageKey) {
    return null;
  }

  const sourceFileName = basename(asset.storageKey);
  const sourceFilePath = join(env.MEDIA_INPUT_DIR, 'director', sourceFileName);
  await access(sourceFilePath);

  const previewFileName = getClipPreviewCacheFileName({
    assetId: asset.id,
    candidateId: candidate.id,
    startMs: candidate.startMs,
    endMs: candidate.endMs,
    sourceFileName,
  });

  return {
    session,
    candidate,
    sourceFilePath,
    previewFileName,
    previewFilePath: join(CLIP_PREVIEW_DIR, previewFileName),
  };
}

async function getPreviewStatus(params: {
  sessionId: string;
  clipId: string;
  previewFilePath: string;
  previewFileName: string;
}): Promise<{ status: 'READY' | 'QUEUED' | 'PROCESSING' | 'FAILED'; progress?: number }> {
  try {
    await access(params.previewFilePath);
    return { status: 'READY', progress: 100 };
  } catch {
    // File not ready.
  }

  const jobId = buildPreviewJobId(params.sessionId, params.clipId, params.previewFileName);
  const job = await directorClipPreviewQueue.getJob(jobId);
  if (!job) {
    return { status: 'FAILED', progress: 0 };
  }

  const state = await job.getState();
  if (state === 'completed') {
    return { status: 'FAILED', progress: 0 };
  }

  if (state === 'failed') {
    return { status: 'FAILED', progress: 0 };
  }

  const rawProgress = job.progress;
  const progress = typeof rawProgress === 'number' ? rawProgress : undefined;
  return state === 'active' ? { status: 'PROCESSING', progress } : { status: 'QUEUED', progress };
}

export const clipMediaRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post<{ Params: { id: string; clipId: string } }>(
    '/sessions/:id/clips/:clipId/preview',
    {
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      const user = request.user;
      if (!user) {
        return reply.status(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      try {
        const previewMedia = await resolveClipPreviewMedia({
          sessionId: request.params.id,
          userId: user.id,
          clipId: request.params.clipId,
        });
        if (!previewMedia) {
          return reply.status(404).send({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Clip preview not found' },
          });
        }

        const cachedStatus = await getPreviewStatus({
          sessionId: request.params.id,
          clipId: request.params.clipId,
          previewFileName: previewMedia.previewFileName,
          previewFilePath: previewMedia.previewFilePath,
        });
        if (cachedStatus.status === 'READY') {
          return reply.send({
            success: true,
            data: {
              status: 'READY',
              progress: 100,
              previewUrl: `/api/v1/director/sessions/${request.params.id}/clips/${request.params.clipId}/preview/file`,
            },
          });
        }

        const jobId = buildPreviewJobId(
          request.params.id,
          request.params.clipId,
          previewMedia.previewFileName,
        );
        const existingJob = await directorClipPreviewQueue.getJob(jobId);
        const existingState = existingJob ? await existingJob.getState() : null;
        if (existingJob && (existingState === 'failed' || existingState === 'completed')) {
          await existingJob.remove();
        }

        if (!existingJob || existingState === 'failed' || existingState === 'completed') {
          await directorClipPreviewQueue.add(
            'render',
            {
              type: 'CLIP_PREVIEW',
              sessionId: request.params.id,
              clipId: request.params.clipId,
              userId: user.id,
              sourceFilePath: previewMedia.sourceFilePath,
              previewFileName: previewMedia.previewFileName,
              previewFilePath: previewMedia.previewFilePath,
              startMs: previewMedia.candidate.startMs,
              endMs: previewMedia.candidate.endMs,
            },
            { jobId },
          );
        }

        const nextStatus = await getPreviewStatus({
          sessionId: request.params.id,
          clipId: request.params.clipId,
          previewFileName: previewMedia.previewFileName,
          previewFilePath: previewMedia.previewFilePath,
        });

        return reply.status(202).send({
          success: true,
          data: {
            status: nextStatus.status === 'FAILED' ? 'QUEUED' : nextStatus.status,
            progress: nextStatus.progress,
          },
        });
      } catch (err) {
        logger.error(
          { err, sessionId: request.params.id, clipId: request.params.clipId },
          'Failed to enqueue clip preview',
        );
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Clip preview not available' },
        });
      }
    },
  );

  fastify.get<{ Params: { id: string; clipId: string } }>(
    '/sessions/:id/clips/:clipId/preview/status',
    {
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      const user = request.user;
      if (!user) {
        return reply.status(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      try {
        const previewMedia = await resolveClipPreviewMedia({
          sessionId: request.params.id,
          userId: user.id,
          clipId: request.params.clipId,
        });
        if (!previewMedia) {
          return reply.status(404).send({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Clip preview not found' },
          });
        }

        const status = await getPreviewStatus({
          sessionId: request.params.id,
          clipId: request.params.clipId,
          previewFileName: previewMedia.previewFileName,
          previewFilePath: previewMedia.previewFilePath,
        });

        return reply.send({
          success: true,
          data: {
            ...status,
            previewUrl:
              status.status === 'READY'
                ? `/api/v1/director/sessions/${request.params.id}/clips/${request.params.clipId}/preview/file`
                : undefined,
          },
        });
      } catch (err) {
        logger.error(
          { err, sessionId: request.params.id, clipId: request.params.clipId },
          'Failed to read clip preview status',
        );
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Clip preview not available' },
        });
      }
    },
  );

  fastify.get<{ Params: { id: string; clipId: string } }>(
    '/sessions/:id/clips/:clipId/preview/file',
    {
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      const user = request.user;
      if (!user) {
        return reply.status(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      try {
        const previewMedia = await resolveClipPreviewMedia({
          sessionId: request.params.id,
          userId: user.id,
          clipId: request.params.clipId,
        });
        if (!previewMedia) {
          return reply.status(404).send({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Clip preview not found' },
          });
        }

        await access(previewMedia.previewFilePath);
        return serveFileWithRange(request, reply, previewMedia.previewFilePath, 'video/mp4');
      } catch (err) {
        logger.error(
          { err, sessionId: request.params.id, clipId: request.params.clipId },
          'Failed to serve clip preview file',
        );
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Clip preview not available' },
        });
      }
    },
  );

  fastify.get<{ Params: { id: string; clipId: string } }>(
    '/sessions/:id/clips/:clipId/poster',
    {
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      const user = request.user;
      if (!user) {
        return reply.status(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      try {
        const clipMedia = await findClipCandidate(
          request.params.id,
          user.id,
          request.params.clipId,
        );
        if (!clipMedia) {
          return reply.status(404).send({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Clip poster not found' },
          });
        }

        const { session, candidate } = clipMedia;
        const asset = session.asset;
        if (!asset?.storageKey) {
          return reply.status(404).send({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Session asset not found' },
          });
        }

        const existingPreviewFileName = candidate.previewStorageKey?.split('/').pop();
        if (
          existingPreviewFileName &&
          canAccessPreviewFile(existingPreviewFileName, [candidate], [], [])
        ) {
          const existingPreviewPath = join(PREVIEW_DIR, existingPreviewFileName);
          try {
            await access(existingPreviewPath);
            return serveFile(reply, existingPreviewPath, 'image/jpeg');
          } catch {
            // Fall through to on-demand poster generation.
          }
        }

        const sourceFileName = basename(asset.storageKey);
        const sourceFilePath = join(env.MEDIA_INPUT_DIR, 'director', sourceFileName);
        await access(sourceFilePath);

        const posterFileName = getClipPosterCacheFileName({
          assetId: asset.id,
          candidateId: candidate.id,
          startMs: candidate.startMs,
          endMs: candidate.endMs,
          sourceFileName,
        });
        const posterFilePath = join(PREVIEW_DIR, posterFileName);

        try {
          await access(posterFilePath);
        } catch {
          await mkdir(PREVIEW_DIR, { recursive: true });
          await directorProcessor.generateClipPreview(
            sourceFilePath,
            PREVIEW_DIR,
            (candidate.startMs + candidate.endMs) / 2,
            posterFileName,
          );
        }

        await access(posterFilePath);
        return serveFile(reply, posterFilePath, 'image/jpeg');
      } catch (err) {
        logger.error(
          { err, sessionId: request.params.id, clipId: request.params.clipId },
          'Failed to serve clip poster',
        );
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Clip poster not available' },
        });
      }
    },
  );

  fastify.get<{ Params: { id: string; filename: string } }>(
    '/sessions/:id/previews/:filename',
    {
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      const user = request.user;
      if (!user) {
        return reply.status(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      try {
        const { filename, id: sessionId } = request.params;

        if (
          !/^((preview|poster)-[a-f0-9-]+\.(jpg|png)|preview_[a-f0-9-]+\.(jpg|png))$/.test(filename)
        ) {
          return reply.status(400).send({
            success: false,
            error: {
              code: 'INVALID_FILENAME',
              message: 'Invalid preview filename',
            },
          });
        }

        const session = await directorRepo.findSession(sessionId, user.id);
        const sessionCandidates = session?.analysisJob?.candidates ?? [];
        const selectedClipCandidates =
          session?.selectedClips.map((clip) => clip.candidate).filter(Boolean) ?? [];
        const resolvedConfig = resolveClipDurationConfig(session?.analysisJob?.config);
        const reusableCandidates = session?.asset
          ? ((await directorAnalysisReuseService.getReusableCandidates(
              session.asset,
              resolvedConfig.targetDurationRange,
            )) ?? [])
          : [];
        const belongsToSession = canAccessPreviewFile(
          filename,
          sessionCandidates,
          selectedClipCandidates,
          reusableCandidates,
        );

        if (!belongsToSession) {
          return reply.status(404).send({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Preview not found' },
          });
        }

        const filePath = join(PREVIEW_DIR, filename);
        await access(filePath);
        return serveFile(reply, filePath, filename.endsWith('.png') ? 'image/png' : 'image/jpeg');
      } catch (err) {
        logger.error({ err }, 'Failed to serve preview');
        return reply.status(500).send({
          success: false,
          error: { code: 'SERVER_ERROR', message: 'Failed to serve preview' },
        });
      }
    },
  );
};
