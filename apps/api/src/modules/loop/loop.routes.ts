import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { AuditAction, audit } from '@/lib/audit';
import { ExportServiceError } from '@/modules/export/export.service';
import { WorkspaceLifecycleError } from '@/modules/workspace/workspace-lifecycle';
import { requireAuth } from '@/plugins/auth';
import {
  loopProjectParamsSchema,
  loopRenderResponseSchema,
  loopSourceInfoResponseSchema,
} from './loop.schemas';
import { LoopRenderServiceError, loopRenderService } from './loop-render.service';

function errorResponse(error: unknown): {
  statusCode: number;
  code: string;
  message: string;
} {
  if (error instanceof z.ZodError) {
    return {
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      message: error.issues[0]?.message ?? 'Invalid request',
    };
  }
  if (
    error instanceof LoopRenderServiceError ||
    error instanceof ExportServiceError ||
    error instanceof WorkspaceLifecycleError
  ) {
    return { statusCode: error.statusCode, code: error.code, message: error.message };
  }
  return {
    statusCode: 500,
    code: 'LOOP_RENDER_FAILED',
    message: 'Render loop gagal diproses. Coba lagi atau cek video sumber.',
  };
}

/**
 * Project-backed routes for rendering one source video into a long-loop export.
 */
export const loopRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/projects/:id/source', { preHandler: [requireAuth] }, async (request, reply) => {
    const userId = request.user?.id;
    if (!userId) {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    try {
      const params = loopProjectParamsSchema.parse(request.params);
      const data = loopSourceInfoResponseSchema.parse(
        await loopRenderService.getSourceInfo(params.id, userId),
      );
      return reply.send({ success: true, data });
    } catch (error) {
      const response = errorResponse(error);
      return reply
        .status(response.statusCode)
        .send({ success: false, error: { code: response.code, message: response.message } });
    }
  });

  fastify.post('/projects/:id/render', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user;
    if (!user) {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    try {
      const params = loopProjectParamsSchema.parse(request.params);
      const data = loopRenderResponseSchema.parse(
        await loopRenderService.createRender({
          projectId: params.id,
          userId: user.id,
          isAdmin: user.role === 'ADMIN',
          requestId: request.id,
        }),
      );

      void audit({
        requestId: request.id,
        userId: user.id,
        tenantId: user.id,
        action: AuditAction.EXPORT_CREATED,
        resourceType: 'loop-creator-export',
        resourceId: data.jobId,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'] ?? undefined,
        metadata: { projectId: params.id, cacheState: data.cacheState },
      });

      return reply.status(201).send({ success: true, data });
    } catch (error) {
      const response = errorResponse(error);
      return reply
        .status(response.statusCode)
        .send({ success: false, error: { code: response.code, message: response.message } });
    }
  });
};
