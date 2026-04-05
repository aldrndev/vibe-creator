import { createReadStream } from 'node:fs';
import { access, mkdir, rename, stat, unlink } from 'node:fs/promises';
import { basename, join } from 'node:path';
import type { FastifyPluginAsync, FastifyReply } from 'fastify';
import { env } from '@/config/env';
import { logger } from '@/lib/logger';
import { requireAuth } from '@/plugins/auth';
import { getClipPosterCacheFileName, getClipPreviewCacheFileName } from '../clip-media-cache';
import { directorProcessor } from '../director.processor';
import { directorRepo } from '../director.repo';
import { canAccessPreviewFile } from '../preview-access';
import { runWithPreviewGenerationLock } from '../preview-generation-lock';
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

  const reusableCandidates =
    (await directorAnalysisReuseService.getReusableCandidates(session.asset)) ?? [];
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

async function ensureClipPreviewFile(params: {
  readonly previewFilePath: string;
  readonly previewFileName: string;
  readonly sourceFilePath: string;
  readonly startMs: number;
  readonly endMs: number;
}) {
  const { previewFilePath, previewFileName, sourceFilePath, startMs, endMs } = params;

  try {
    await access(previewFilePath);
    return;
  } catch {
    // File is missing; generate it once per preview path.
  }

  await runWithPreviewGenerationLock(previewFilePath, async () => {
    try {
      await access(previewFilePath);
      return;
    } catch {
      // Continue generation when still missing inside the lock.
    }

    await mkdir(CLIP_PREVIEW_DIR, { recursive: true });

    const tempFileName = `${previewFileName}.tmp-${Date.now()}.mp4`;
    const tempFilePath = join(CLIP_PREVIEW_DIR, tempFileName);

    try {
      await directorProcessor.generateClipVideoPreview(
        sourceFilePath,
        CLIP_PREVIEW_DIR,
        startMs,
        endMs,
        tempFileName,
      );
      await rename(tempFilePath, previewFilePath);
    } catch (error) {
      try {
        await unlink(tempFilePath);
      } catch {
        // Ignore temp cleanup errors.
      }

      throw error;
    }
  });
}

export const clipMediaRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get<{ Params: { id: string; clipId: string } }>(
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
        const clipMedia = await findClipCandidate(
          request.params.id,
          user.id,
          request.params.clipId,
        );
        if (!clipMedia) {
          return reply.status(404).send({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Clip preview not found' },
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
        const previewFilePath = join(CLIP_PREVIEW_DIR, previewFileName);

        await ensureClipPreviewFile({
          previewFilePath,
          previewFileName,
          sourceFilePath,
          startMs: candidate.startMs,
          endMs: candidate.endMs,
        });

        await access(previewFilePath);
        return serveFile(reply, previewFilePath, 'video/mp4');
      } catch (err) {
        logger.error(
          { err, sessionId: request.params.id, clipId: request.params.clipId },
          'Failed to serve clip preview',
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
        const reusableCandidates = session?.asset
          ? ((await directorAnalysisReuseService.getReusableCandidates(session.asset)) ?? [])
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
