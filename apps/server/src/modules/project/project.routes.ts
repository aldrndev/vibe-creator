import type { FastifyInstance } from 'fastify';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/plugins/auth';
import { z } from 'zod';

const createProjectSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
});

const updateProjectSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
});

export async function projectRoutes(fastify: FastifyInstance): Promise<void> {
  // List projects
  fastify.get('/', { preHandler: [requireAuth] }, async (request, reply) => {
    const { page = 1, limit = 20 } = request.query as { page?: number; limit?: number };
    
    const skip = (Number(page) - 1) * Number(limit);
    const take = Math.min(Number(limit), 100);

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where: { userId: request.user!.id },
        orderBy: { updatedAt: 'desc' },
        skip,
        take,
        include: {
          _count: { select: { assets: true } },
        },
      }),
      prisma.project.count({
        where: { userId: request.user!.id },
      }),
    ]);

    return reply.send({
      success: true,
      data: projects,
      meta: {
        page: Number(page),
        limit: take,
        total,
        totalPages: Math.ceil(total / take),
      },
    });
  });

  // Get single project
  fastify.get('/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const project = await prisma.project.findFirst({
      where: { id, userId: request.user!.id },
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
  });

  // Create project
  fastify.post('/', { preHandler: [requireAuth] }, async (request, reply) => {
    const body = createProjectSchema.parse(request.body);

    const project = await prisma.project.create({
      data: {
        ...body,
        userId: request.user!.id,
      },
    });

    return reply.status(201).send({ success: true, data: project });
  });

  // Update project
  fastify.patch('/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = updateProjectSchema.parse(request.body);

    const existing = await prisma.project.findFirst({
      where: { id, userId: request.user!.id },
    });

    if (!existing) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Project not found' },
      });
    }

    const project = await prisma.project.update({
      where: { id },
      data: body,
    });

    return reply.send({ success: true, data: project });
  });

  // Delete project
  fastify.delete('/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const existing = await prisma.project.findFirst({
      where: { id, userId: request.user!.id },
    });

    if (!existing) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Project not found' },
      });
    }

    await prisma.project.delete({ where: { id } });

    return reply.send({ success: true, data: null });
  });
}
