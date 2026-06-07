import { createReadStream } from 'node:fs';
import { access, stat } from 'node:fs/promises';
import { basename, join } from 'node:path';
import type { FastifyPluginAsync, FastifyReply } from 'fastify';
import { z } from 'zod';
import { env } from '@/config/env';
import { logger } from '@/lib/logger';
import { requireAuth } from '@/plugins/auth';
import { directorRepo } from '../director.repo';
import { directorService } from '../director.service';
import { DirectorSourceLimitError } from '../source-limits';

const INITIAL_UPLOAD_PROGRESS = 0;

const importAssetSchema = z
  .object({
    type: z.enum(['url', 'file']),
    url: z.url().optional(),
    filePath: z.string().optional(),
  })
  .refine(
    (data) => (data.type === 'url' && !!data.url) || (data.type === 'file' && !!data.filePath),
    {
      message: "URL required for type 'url', filePath required for type 'file'",
    },
  );

async function handleUploadingStatus(
  assetId: string,
  assetCreatedAt: Date,
  redis: { get(key: string): Promise<string | null> },
): Promise<{ progress: number; errorMessage: string | null; isFailedStale: boolean }> {
  let progress = INITIAL_UPLOAD_PROGRESS;
  let errorMessage: string | null = null;
  let isFailedStale = false;

  const progressKey = `director:asset:${assetId}:progress`;
  const rawProgress = await redis.get(progressKey);

  if (rawProgress) {
    progress = Number.parseInt(rawProgress, 10);
  } else {
    const now = new Date();
    const staleThreshold = 2 * 60 * 1000;
    if (now.getTime() - assetCreatedAt.getTime() > staleThreshold) {
      await directorRepo.updateAsset(assetId, {
        ingestStatus: 'FAILED',
      });
      isFailedStale = true;
      return { progress: 0, errorMessage: 'Upload timed out or server restarted', isFailedStale };
    }
  }

  const errorKey = `director:asset:${assetId}:error`;
  const redisError = await redis.get(errorKey);
  if (redisError) {
    errorMessage = redisError;
  }

  return { progress, errorMessage, isFailedStale };
}

function handleImportError(err: unknown, reply: FastifyReply) {
  logger.error({ err }, 'Import failed');
  if (err instanceof z.ZodError) {
    return reply.status(400).send({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: err.issues[0]?.message,
      },
    });
  }
  if (err instanceof DirectorSourceLimitError) {
    return reply.status(err.statusCode).send({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    });
  }
  const message = err instanceof Error ? err.message : 'Import failed';
  let code = 'IMPORT_FAILED';
  if (message.includes('belum didukung') || message.includes('not supported')) {
    code = 'UNSUPPORTED_SOURCE';
  } else if (message.includes('Invalid URL')) {
    code = 'INVALID_URL';
  }
  return reply.status(400).send({
    success: false,
    error: { code, message },
  });
}

export const assetRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * Get asset status (polling for progress)
   */
  fastify.get<{ Params: { id: string } }>(
    '/assets/:id/status',
    {
      config: {
        rateLimit: false,
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const user = request.user;
      if (!user) {
        return reply.status(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Auth required' },
        });
      }

      try {
        // Check local Redis for progress
        const { redis } = await import('@/lib/redis');

        // Check DB for status first, scoped to the requesting user.
        const asset = await directorRepo.findAssetByIdForUser(id, user.id);
        if (!asset) {
          return reply.status(404).send({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Asset not found' },
          });
        }

        let progress = 0;
        let errorMessage: string | null = null;

        if (asset.ingestStatus === 'UPLOADING') {
          const status = await handleUploadingStatus(asset.id, asset.createdAt, redis);

          if (status.isFailedStale) {
            return reply.send({
              success: true,
              data: {
                id: asset.id,
                status: 'FAILED',
                progress: 0,
                errorMessage: status.errorMessage,
              },
            });
          }

          progress = status.progress;
          errorMessage = status.errorMessage;
        } else if (asset.ingestStatus === 'READY') {
          progress = 100;
        }

        return reply.send({
          success: true,
          data: {
            id: asset.id,
            status: asset.ingestStatus,
            progress,
            errorMessage,
          },
        });
      } catch {
        return reply.status(500).send({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: 'Failed to get status' },
        });
      }
    },
  );

  /**
   * Import from URL
   */
  fastify.post<{ Params: { id: string } }>(
    '/sessions/:id/import',
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
        const body = importAssetSchema.parse(request.body);
        const asset = await directorService.importAsset(request.params.id, user, body);
        return reply.status(201).send({
          success: true,
          data: asset,
        });
      } catch (err) {
        return handleImportError(err, reply);
      }
    },
  );

  /**
   * Get asset info
   */
  fastify.get<{ Params: { id: string } }>(
    '/sessions/:id/asset',
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
        const asset = await directorService.getAsset(request.params.id, user.id);
        return reply.send({
          success: true,
          data: asset,
        });
      } catch {
        return reply.status(404).send({
          success: false,
          error: { code: 'ASSET_MISSING', message: 'Asset not found' },
        });
      }
    },
  );

  /**
   * Serve asset file (video)
   */
  fastify.get<{ Params: { id: string } }>(
    '/sessions/:id/asset/stream',
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
        const asset = await directorService.getAsset(request.params.id, user.id);

        if (!asset.storageKey) {
          return reply.status(404).send({
            success: false,
            error: {
              code: 'ASSET_PENDING',
              message: 'Asset processing/uploading',
            },
          });
        }

        const fileName = basename(asset.storageKey);
        const filePath = join(env.MEDIA_INPUT_DIR, 'director', fileName);

        try {
          await access(filePath);
        } catch {
          return reply.status(404).send({
            success: false,
            error: {
              code: 'FILE_MISSING',
              message: 'Asset file not found on server',
            },
          });
        }

        const fileStats = await stat(filePath);
        return reply
          .type(asset.mimeType)
          .header('Content-Length', fileStats.size)
          .header('X-Content-Type-Options', 'nosniff')
          .send(createReadStream(filePath));
      } catch {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Session or asset not found' },
        });
      }
    },
  );
};
