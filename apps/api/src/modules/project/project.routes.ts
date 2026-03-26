import { performance } from 'node:perf_hooks';
import type { Prisma } from '@prisma/client';
import { MAX_LIMIT } from '@vibe-creator/shared';
import type { FastifyInstance } from 'fastify';
import { AuditAction, audit } from '@/lib/audit';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/plugins/auth';
import { createCursorResult, decodeCursor } from '@/utils/cursor-pagination';
import { enforceQueryBudget } from '@/utils/query-budget';
import {
  createProjectRequestSchema,
  createProjectRouteSchema,
  deleteProjectRouteSchema,
  getProjectRouteSchema,
  listProjectsRouteSchema,
  updateProjectRequestSchema,
  updateProjectRouteSchema,
} from './project.schemas';

export async function projectRoutes(fastify: FastifyInstance): Promise<void> {
  // List projects with cursor pagination
  fastify.get(
    '/',
    {
      preHandler: [requireAuth],
      schema: listProjectsRouteSchema,
    },
    async (request, reply) => {
      const query = request.query as {
        page?: number;
        limit?: number;
        cursor?: string;
      };

      const limit = Math.min(Number(query.limit) || 20, MAX_LIMIT);
      const userId = request.user?.id;

      // If cursor provided, use cursor pagination
      if (query.cursor) {
        const decoded = decodeCursor(query.cursor);
        const cursorWhere = decoded
          ? {
              userId,
              OR: [
                { createdAt: { lt: decoded.ts } },
                { createdAt: decoded.ts, id: { lt: decoded.id } },
              ],
            }
          : { userId };

        const start = performance.now();
        const projects = await prisma.project.findMany({
          where: cursorWhere,
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          take: limit + 1,
          include: { _count: { select: { assets: true } } },
        });
        const durationMs = performance.now() - start;

        if (enforceQueryBudget(reply, { durationMs, rows: projects.length })) {
          return reply;
        }

        const result = createCursorResult(projects, limit);
        return reply.send({ success: true, data: result });
      }

      // Fallback: offset pagination
      const page = Number(query.page) || 1;
      const skip = (page - 1) * limit;

      const start = performance.now();
      const [projects, total] = await Promise.all([
        prisma.project.findMany({
          where: { userId },
          orderBy: { updatedAt: 'desc' },
          skip,
          take: limit,
          include: { _count: { select: { assets: true } } },
        }),
        prisma.project.count({ where: { userId } }),
      ]);
      const durationMs = performance.now() - start;

      if (enforceQueryBudget(reply, { durationMs, rows: projects.length })) {
        return reply;
      }

      return reply.send({
        success: true,
        data: projects,
        meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    },
  );

  // Get single project
  fastify.get(
    '/:id',
    {
      preHandler: [requireAuth],
      schema: getProjectRouteSchema,
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      const project = await prisma.project.findFirst({
        where: { id, userId: request.user?.id },
        include: {
          assets: {
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      if (!project) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Project not found' },
        });
      }

      return reply.send({ success: true, data: project });
    },
  );

  // Create project
  fastify.post(
    '/',
    {
      preHandler: [requireAuth],
      schema: createProjectRouteSchema,
    },
    async (request, reply) => {
      const body = createProjectRequestSchema.parse(request.body);
      const userId = request.user?.id;

      if (!userId) {
        throw new Error('Authenticated user missing on project creation');
      }

      const project = await prisma.project.create({
        data: {
          ...body,
          storyData: body.storyData as Prisma.InputJsonValue,
          userId,
        },
      });

      return reply.status(201).send({ success: true, data: project });
    },
  );

  // Update project
  fastify.patch(
    '/:id',
    {
      preHandler: [requireAuth],
      schema: updateProjectRouteSchema,
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = updateProjectRequestSchema.parse(request.body);

      const existing = await prisma.project.findFirst({
        where: { id, userId: request.user?.id },
      });

      if (!existing) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Project not found' },
        });
      }

      const project = await prisma.project.update({
        where: { id },
        data: {
          ...body,
          storyData: body.storyData as Prisma.InputJsonValue,
        },
      });

      return reply.send({ success: true, data: project });
    },
  );

  // Delete project
  fastify.delete(
    '/:id',
    {
      preHandler: [requireAuth],
      schema: deleteProjectRouteSchema,
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      const existing = await prisma.project.findFirst({
        where: { id, userId: request.user?.id },
      });

      if (!existing) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Project not found' },
        });
      }

      await prisma.project.delete({ where: { id } });

      if (request.user) {
        void audit({
          requestId: request.id,
          userId: request.user.id,
          tenantId: request.user.id,
          action: AuditAction.PROJECT_DELETED,
          resourceType: 'project',
          resourceId: id,
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'] ?? undefined,
        });
      }

      return reply.send({ success: true, data: null });
    },
  );
}
