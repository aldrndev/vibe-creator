import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '@/plugins/auth';
import {
  lastActiveWorkspaceQuerySchema,
  recentWorkspacesQuerySchema,
  workspaceParamsSchema,
} from './workspace.schemas';
import { workspaceService } from './workspace.service';

function validationMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? 'Invalid request';
}

export const workspaceRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    '/recent',
    {
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      const userId = request.user?.id;
      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      try {
        const query = recentWorkspacesQuerySchema.parse(request.query);
        const data = await workspaceService.listRecent(userId, query);
        return reply.send({ success: true, data });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: validationMessage(error) },
          });
        }

        const message = error instanceof Error ? error.message : 'Failed to load recent workspaces';
        return reply.status(500).send({
          success: false,
          error: { code: 'RECENT_WORKSPACES_FAILED', message },
        });
      }
    },
  );

  fastify.get(
    '/last-active',
    {
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      const userId = request.user?.id;
      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      try {
        const query = lastActiveWorkspaceQuerySchema.parse(request.query);
        const data = await workspaceService.getLastActive(userId, query.tool);
        return reply.send({ success: true, data });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: validationMessage(error) },
          });
        }

        const message = error instanceof Error ? error.message : 'Failed to load last workspace';
        return reply.status(500).send({
          success: false,
          error: { code: 'LAST_WORKSPACE_FAILED', message },
        });
      }
    },
  );

  fastify.post(
    '/:kind/:id/complete',
    {
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      const userId = request.user?.id;
      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      try {
        const params = workspaceParamsSchema.parse(request.params);
        const data = await workspaceService.completeWorkspace(userId, params.kind, params.id);
        if (!data) {
          return reply.status(404).send({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Workspace not found' },
          });
        }
        return reply.send({ success: true, data });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: validationMessage(error) },
          });
        }
        const message = error instanceof Error ? error.message : 'Failed to complete workspace';
        return reply.status(400).send({
          success: false,
          error: { code: 'COMPLETE_WORKSPACE_FAILED', message },
        });
      }
    },
  );

  fastify.post(
    '/:kind/:id/duplicate',
    {
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      const userId = request.user?.id;
      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      try {
        const params = workspaceParamsSchema.parse(request.params);
        const data = await workspaceService.duplicateWorkspace(userId, params.kind, params.id);
        if (!data) {
          return reply.status(404).send({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Workspace not found' },
          });
        }
        return reply.status(201).send({ success: true, data });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: validationMessage(error) },
          });
        }
        const message = error instanceof Error ? error.message : 'Failed to duplicate workspace';
        return reply.status(400).send({
          success: false,
          error: { code: 'DUPLICATE_WORKSPACE_FAILED', message },
        });
      }
    },
  );

  fastify.delete(
    '/:kind/:id',
    {
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      const userId = request.user?.id;
      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      try {
        const params = workspaceParamsSchema.parse(request.params);
        const deleted = await workspaceService.softDeleteWorkspace(userId, params.kind, params.id);
        if (!deleted) {
          return reply.status(404).send({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Workspace not found' },
          });
        }
        return reply.send({ success: true, data: { deleted: true } });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: validationMessage(error) },
          });
        }
        const message = error instanceof Error ? error.message : 'Failed to delete workspace';
        return reply.status(400).send({
          success: false,
          error: { code: 'DELETE_WORKSPACE_FAILED', message },
        });
      }
    },
  );
};
