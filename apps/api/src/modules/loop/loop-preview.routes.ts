import { createReadStream } from 'node:fs';
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { WorkspaceLifecycleError } from '@/modules/workspace/workspace-lifecycle';
import { requireAuth } from '@/plugins/auth';
import {
  type LoopPreviewEvent,
  loopPreviewParamsSchema,
  loopPreviewResponseSchema,
  loopProjectParamsSchema,
} from './loop.schemas';
import {
  formatLoopPreviewSseEvent,
  getLoopPreviewHeartbeatMs,
  subscribeToLoopPreviewEvents,
} from './loop-preview.events';
import { LoopPreviewServiceError, loopPreviewService } from './loop-preview.service';
import { LoopRenderServiceError } from './loop-render.service';

function respondError(error: unknown) {
  if (error instanceof z.ZodError) {
    return { statusCode: 400, code: 'VALIDATION_ERROR', message: 'Request preview tidak valid.' };
  }
  if (
    error instanceof LoopPreviewServiceError ||
    error instanceof LoopRenderServiceError ||
    error instanceof WorkspaceLifecycleError
  ) {
    return { statusCode: error.statusCode, code: error.code, message: error.message };
  }
  return {
    statusCode: 500,
    code: 'PREVIEW_FAILED',
    message: 'Preview loop belum dapat dibuat. Coba lagi.',
  };
}

import type { FastifyReply } from 'fastify';

function setupSseConnection(reply: FastifyReply) {
  reply.raw.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  reply.hijack();
}

function handleInitialPreviewStatus(
  status: Awaited<ReturnType<typeof loopPreviewService.getStatus>>,
  write: (event: LoopPreviewEvent) => void,
): boolean {
  write({
    type: 'snapshot',
    previewId: status.previewId,
    status: status.status,
    progress: status.progress,
    phase: status.phase,
  });

  if (status.status === 'COMPLETED' && status.previewUrl && status.expiresAt) {
    write({
      type: 'completed',
      previewId: status.previewId,
      status: 'COMPLETED',
      progress: 100,
      previewUrl: status.previewUrl,
      expiresAt: status.expiresAt,
    });
    return true;
  }

  if (status.status === 'FAILED') {
    write({
      type: 'failed',
      previewId: status.previewId,
      status: 'FAILED',
      errorMessage: status.errorMessage ?? 'Preview loop tidak tersedia.',
    });
    return true;
  }

  if (status.status === 'EXPIRED') {
    write({
      type: 'expired',
      previewId: status.previewId,
      status: 'EXPIRED',
      errorMessage: status.errorMessage ?? 'Preview loop tidak tersedia.',
    });
    return true;
  }

  return false;
}

export const loopPreviewRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/projects/:id/preview', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user;
    if (!user) {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }
    try {
      const params = loopProjectParamsSchema.parse(request.params);
      const response = await loopPreviewService.create({
        projectId: params.id,
        userId: user.id,
        isAdmin: user.role === 'ADMIN',
        requestId: request.id,
      });
      return reply.status(response.reused ? 200 : 201).send({
        success: true,
        data: loopPreviewResponseSchema.parse(response),
      });
    } catch (error) {
      const response = respondError(error);
      return reply
        .status(response.statusCode)
        .send({ success: false, error: { code: response.code, message: response.message } });
    }
  });

  fastify.get(
    '/previews/:previewId/status',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const userId = request.user?.id;
      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }
      try {
        const params = loopPreviewParamsSchema.parse(request.params);
        const response = await loopPreviewService.getStatus(params.previewId, userId);
        return reply.send({ success: true, data: loopPreviewResponseSchema.parse(response) });
      } catch (error) {
        const response = respondError(error);
        return reply
          .status(response.statusCode)
          .send({ success: false, error: { code: response.code, message: response.message } });
      }
    },
  );

  fastify.get(
    '/previews/:previewId/file',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const userId = request.user?.id;
      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }
      try {
        const params = loopPreviewParamsSchema.parse(request.params);
        const preview = await loopPreviewService.getFile(params.previewId, userId);
        return reply
          .type('video/mp4')
          .header('Cache-Control', 'private, max-age=3600')
          .send(createReadStream(preview.localPath ?? ''));
      } catch (error) {
        const response = respondError(error);
        return reply
          .status(response.statusCode)
          .send({ success: false, error: { code: response.code, message: response.message } });
      }
    },
  );

  fastify.get(
    '/previews/:previewId/events',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const userId = request.user?.id;
      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }
      let heartbeat: NodeJS.Timeout | null = null;
      let unsubscribe: (() => Promise<void>) | null = null;
      try {
        const params = loopPreviewParamsSchema.parse(request.params);
        const status = await loopPreviewService.getStatus(params.previewId, userId);

        setupSseConnection(reply);

        const close = async () => {
          if (heartbeat) clearInterval(heartbeat);
          heartbeat = null;
          if (unsubscribe) await unsubscribe();
          unsubscribe = null;
          if (!reply.raw.destroyed) reply.raw.end();
        };
        const write = (event: LoopPreviewEvent) => {
          if (reply.raw.destroyed) return;
          reply.raw.write(formatLoopPreviewSseEvent(event));
          if (event.type === 'completed' || event.type === 'failed' || event.type === 'expired') {
            void close();
          }
        };

        const isFinished = handleInitialPreviewStatus(status, write);
        if (isFinished) return;

        unsubscribe = await subscribeToLoopPreviewEvents(status.previewId, write);
        heartbeat = setInterval(
          () => reply.raw.write(': heartbeat\n\n'),
          getLoopPreviewHeartbeatMs(),
        );
        request.raw.on('close', () => void close());
      } catch (error) {
        if (!reply.sent) {
          const response = respondError(error);
          return reply
            .status(response.statusCode)
            .send({ success: false, error: { code: response.code, message: response.message } });
        }
      }
    },
  );
};
