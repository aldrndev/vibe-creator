import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { AuditAction, audit } from '@/lib/audit';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';

const MAX_VERSIONS_PER_PROJECT = 10;

const createVersionSchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().max(255).optional(),
  timelineData: z.record(z.string(), z.unknown()),
  textOverlays: z.array(z.record(z.string(), z.unknown())).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const updateVersionSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  description: z.string().max(255).optional(),
});

export const projectVersionRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * List versions for a project
   */
  fastify.get<{ Params: { projectId: string } }>(
    '/:projectId/versions',
    async (request: FastifyRequest<{ Params: { projectId: string } }>, reply: FastifyReply) => {
      const user = request.user;
      if (!user) {
        return reply.status(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      // Verify project ownership
      const project = await prisma.project.findFirst({
        where: { id: request.params.projectId, userId: user.id },
      });

      if (!project) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Project not found' },
        });
      }

      const versions = await prisma.projectVersion.findMany({
        where: { projectId: request.params.projectId },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          description: true,
          createdAt: true,
        },
      });

      return reply.send({
        success: true,
        data: versions,
      });
    },
  );

  /**
   * Create a new version (snapshot)
   */
  fastify.post<{
    Params: { projectId: string };
    Body: z.infer<typeof createVersionSchema>;
  }>(
    '/:projectId/versions',
    async (
      request: FastifyRequest<{
        Params: { projectId: string };
        Body: z.infer<typeof createVersionSchema>;
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
        const body = createVersionSchema.parse(request.body);

        // Verify project ownership
        const project = await prisma.project.findFirst({
          where: { id: request.params.projectId, userId: user.id },
        });

        if (!project) {
          return reply.status(404).send({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Project not found' },
          });
        }

        // Check version limit
        const versionCount = await prisma.projectVersion.count({
          where: { projectId: request.params.projectId },
        });

        if (versionCount >= MAX_VERSIONS_PER_PROJECT) {
          // Delete oldest version
          const oldestVersion = await prisma.projectVersion.findFirst({
            where: { projectId: request.params.projectId },
            orderBy: { createdAt: 'asc' },
          });

          if (oldestVersion) {
            await prisma.projectVersion.delete({
              where: { id: oldestVersion.id },
            });

            logger.info(
              {
                projectId: request.params.projectId,
                deletedVersionId: oldestVersion.id,
              },
              'Deleted oldest version to make room for new one',
            );
          }
        }

        const version = await prisma.projectVersion.create({
          data: {
            projectId: request.params.projectId,
            name: body.name,
            description: body.description,
            timelineData: body.timelineData as object,
            textOverlays: (body.textOverlays ?? []) as object[],
            metadata: (body.metadata ?? {}) as object,
          },
        });

        logger.info(
          {
            userId: user.id,
            projectId: request.params.projectId,
            versionId: version.id,
            versionName: version.name,
          },
          'Created project version',
        );

        return reply.status(201).send({
          success: true,
          data: {
            id: version.id,
            name: version.name,
            description: version.description,
            createdAt: version.createdAt,
          },
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
        throw err;
      }
    },
  );

  /**
   * Get a specific version (with full data)
   */
  fastify.get<{ Params: { projectId: string; versionId: string } }>(
    '/:projectId/versions/:versionId',
    async (
      request: FastifyRequest<{
        Params: { projectId: string; versionId: string };
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

      // Verify project ownership
      const project = await prisma.project.findFirst({
        where: { id: request.params.projectId, userId: user.id },
      });

      if (!project) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Project not found' },
        });
      }

      const version = await prisma.projectVersion.findFirst({
        where: {
          id: request.params.versionId,
          projectId: request.params.projectId,
        },
      });

      if (!version) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Version not found' },
        });
      }

      return reply.send({
        success: true,
        data: version,
      });
    },
  );

  /**
   * Update version metadata
   */
  fastify.patch<{ Params: { projectId: string; versionId: string } }>(
    '/:projectId/versions/:versionId',
    async (
      request: FastifyRequest<{
        Params: { projectId: string; versionId: string };
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
        const body = updateVersionSchema.parse(request.body);

        // Verify project ownership
        const project = await prisma.project.findFirst({
          where: { id: request.params.projectId, userId: user.id },
        });

        if (!project) {
          return reply.status(404).send({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Project not found' },
          });
        }

        const version = await prisma.projectVersion.updateMany({
          where: {
            id: request.params.versionId,
            projectId: request.params.projectId,
            // Ensure ownership indirectly via verify above,
            // or just rely on IDs since version IDs are UUIDs.
            // But good to be safe.
          },
          data: body,
        });

        if (version.count === 0) {
          return reply.status(404).send({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Version not found' },
          });
        }

        return reply.send({
          success: true,
          data: { updated: true },
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
        throw err;
      }
    },
  );

  /**
   * Delete a version
   */
  fastify.delete<{ Params: { projectId: string; versionId: string } }>(
    '/:projectId/versions/:versionId',
    async (
      request: FastifyRequest<{
        Params: { projectId: string; versionId: string };
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

      // Verify project ownership
      const project = await prisma.project.findFirst({
        where: { id: request.params.projectId, userId: user.id },
      });

      if (!project) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Project not found' },
        });
      }

      const result = await prisma.projectVersion.deleteMany({
        where: {
          id: request.params.versionId,
          projectId: request.params.projectId,
        },
      });

      if (result.count === 0) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Version not found' },
        });
      }

      logger.info(
        {
          userId: user.id,
          projectId: request.params.projectId,
          versionId: request.params.versionId,
        },
        'Deleted project version',
      );

      void audit({
        requestId: request.id,
        userId: user.id,
        tenantId: user.id,
        action: AuditAction.RESOURCE_DELETED,
        resourceType: 'project_version',
        resourceId: request.params.versionId,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'] ?? undefined,
        metadata: { projectId: request.params.projectId },
      });

      return reply.send({
        success: true,
        data: { deleted: true },
      });
    },
  );
};
