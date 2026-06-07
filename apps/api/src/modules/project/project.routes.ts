import { randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { copyFile, mkdir, stat, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { type AssetType, LifecycleStatus, type Prisma } from '@prisma/client';
import { MAX_LIMIT } from '@vibe-creator/shared';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { env } from '@/config/env';
import { AuditAction, audit } from '@/lib/audit';
import { prisma } from '@/lib/prisma';
import {
  getStudioAsset,
  getStudioAudioAssetFileExtension,
  getStudioAudioAssetMimeType,
  materializeStudioAudioAsset,
} from '@/modules/video-studio/video-studio-assets.service';
import {
  assertWorkspaceActive,
  getActiveDraftExpiresAt,
  WorkspaceLifecycleError,
} from '@/modules/workspace/workspace-lifecycle';
import { requireAuth } from '@/plugins/auth';
import { createCursorResult, decodeCursor } from '@/utils/cursor-pagination';
import { enforceQueryBudget } from '@/utils/query-budget';
import { resolveTempUploadToken } from '@/utils/temp-upload';
import {
  attachProjectAssetRequestSchema,
  attachStudioAssetRequestSchema,
  createProjectRequestSchema,
  createProjectRouteSchema,
  deleteProjectRouteSchema,
  getProjectRouteSchema,
  listProjectsRouteSchema,
  updateProjectRequestSchema,
  updateProjectRouteSchema,
} from './project.schemas';

function metadataString(metadata: Prisma.JsonValue, key: string): string | null {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return null;
  }

  const value = (metadata as Record<string, unknown>)[key];
  return typeof value === 'string' ? value : null;
}

function resolveProjectAssetPath(projectId: string, r2Key: string): string {
  return join(env.MEDIA_INPUT_DIR, 'projects', projectId, r2Key.split('/').pop() ?? '');
}

function safeFileSegment(value: string): string {
  return value.replace(/[^a-z0-9-]/gi, '-').slice(0, 80) || 'studio-asset';
}

function validateExistingAsset(
  existingAsset: { projectId: string; project: { userId: string | null } } | null,
  projectId: string,
  userId?: string,
) {
  if (existingAsset && existingAsset.projectId !== projectId) {
    return {
      status: 409,
      code: 'ASSET_CONFLICT',
      message: 'Asset ID already belongs to another project',
    };
  }

  if (existingAsset?.project?.userId && existingAsset.project.userId !== userId) {
    return {
      status: 403,
      code: 'FORBIDDEN',
      message: 'Asset is not owned by this user',
    };
  }

  return null;
}

async function handleAttachFromUploadToken(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };

  try {
    const body = attachProjectAssetRequestSchema.parse(request.body);
    const project = await prisma.project.findFirst({
      where: { id, userId: request.user?.id, deletedAt: null },
    });

    if (!project) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Project not found' },
      });
    }

    assertWorkspaceActive(project.lifecycleStatus, project.expiresAt);

    const existingAsset = await prisma.projectAsset.findFirst({
      where: { id: body.assetId },
      include: { project: { select: { userId: true } } },
    });

    const assetError = validateExistingAsset(existingAsset, id, request.user?.id);
    if (assetError) {
      return reply.status(assetError.status).send({
        success: false,
        error: { code: assetError.code, message: assetError.message },
      });
    }

    const tempPath = resolveTempUploadToken(body.uploadToken);
    const projectDir = join(env.MEDIA_INPUT_DIR, 'projects', id);
    const fileName = `${body.assetId}-${body.uploadToken}`;
    const targetPath = join(projectDir, fileName);
    const r2Key = `uploads/projects/${id}/${fileName}`;
    await mkdir(projectDir, { recursive: true });
    await copyFile(tempPath, targetPath);
    await unlink(tempPath).catch(() => {});

    const sourceUrl = `/api/v1/projects/assets/${body.assetId}/file`;
    const metadata = {
      libraryPurpose: body.libraryPurpose ?? 'media',
      mimeType: body.mimeType ?? null,
      size: body.size ?? null,
      durationMs: body.durationMs ?? null,
      width: body.width ?? null,
      height: body.height ?? null,
    };

    const asset = await prisma.projectAsset.upsert({
      where: { id: body.assetId },
      create: {
        id: body.assetId,
        projectId: id,
        type: body.type as AssetType,
        name: body.name,
        sourceUrl,
        r2Key,
        metadata,
      },
      update: {
        type: body.type as AssetType,
        name: body.name,
        sourceUrl,
        r2Key,
        metadata,
      },
    });

    await prisma.project.update({
      where: { id },
      data: {
        lifecycleStatus: LifecycleStatus.ACTIVE,
        expiresAt: getActiveDraftExpiresAt(),
      },
    });

    return reply.status(201).send({ success: true, data: asset });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: error.issues[0]?.message },
      });
    }
    if (error instanceof WorkspaceLifecycleError) {
      return reply.status(410).send({
        success: false,
        error: { code: error.code, message: error.message },
      });
    }

    const message = error instanceof Error ? error.message : 'Failed to attach project asset';
    return reply.status(400).send({
      success: false,
      error: { code: 'ATTACH_ASSET_FAILED', message },
    });
  }
}

async function handleAttachFromStudioAsset(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };

  try {
    const body = attachStudioAssetRequestSchema.parse(request.body);
    const project = await prisma.project.findFirst({
      where: { id, userId: request.user?.id, deletedAt: null },
    });

    if (!project) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Project not found' },
      });
    }

    assertWorkspaceActive(project.lifecycleStatus, project.expiresAt);

    const studioAsset = getStudioAsset(body.studioAssetId);
    if (studioAsset?.kind !== 'audio') {
      return reply.status(404).send({
        success: false,
        error: { code: 'STUDIO_ASSET_NOT_FOUND', message: 'Studio audio asset not found' },
      });
    }

    const assetId = body.assetId ?? randomUUID();
    const existingAsset = await prisma.projectAsset.findFirst({
      where: { id: assetId },
      include: { project: { select: { userId: true } } },
    });

    const assetError = validateExistingAsset(existingAsset, id, request.user?.id);
    if (assetError) {
      return reply.status(assetError.status).send({
        success: false,
        error: { code: assetError.code, message: assetError.message },
      });
    }

    const projectDir = join(env.MEDIA_INPUT_DIR, 'projects', id);
    const extension = getStudioAudioAssetFileExtension(studioAsset);
    const fileName = `${assetId}-${safeFileSegment(studioAsset.id)}${extension}`;
    const targetPath = join(projectDir, fileName);
    const r2Key = `uploads/projects/${id}/${fileName}`;
    await mkdir(projectDir, { recursive: true });
    await materializeStudioAudioAsset(studioAsset.id, targetPath);

    const sourceUrl = `/api/v1/projects/assets/${assetId}/file`;
    const metadata = {
      mimeType: getStudioAudioAssetMimeType(studioAsset),
      size: null,
      durationMs: studioAsset.durationMs,
      studioAssetId: studioAsset.id,
      source: studioAsset.source,
      license: studioAsset.license,
      category: studioAsset.category,
    };

    const asset = await prisma.projectAsset.upsert({
      where: { id: assetId },
      create: {
        id: assetId,
        projectId: id,
        type: 'AUDIO',
        name: studioAsset.title,
        sourceUrl,
        r2Key,
        metadata,
      },
      update: {
        type: 'AUDIO',
        name: studioAsset.title,
        sourceUrl,
        r2Key,
        metadata,
      },
    });

    await prisma.project.update({
      where: { id },
      data: {
        lifecycleStatus: LifecycleStatus.ACTIVE,
        expiresAt: getActiveDraftExpiresAt(),
      },
    });

    return reply.status(201).send({ success: true, data: asset });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: error.issues[0]?.message },
      });
    }
    if (error instanceof WorkspaceLifecycleError) {
      return reply.status(410).send({
        success: false,
        error: { code: error.code, message: error.message },
      });
    }

    const message = error instanceof Error ? error.message : 'Failed to attach studio asset';
    return reply.status(400).send({
      success: false,
      error: { code: 'ATTACH_STUDIO_ASSET_FAILED', message },
    });
  }
}

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
          where: { ...cursorWhere, deletedAt: null },
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
          where: { userId, deletedAt: null },
          orderBy: { updatedAt: 'desc' },
          skip,
          take: limit,
          include: { _count: { select: { assets: true } } },
        }),
        prisma.project.count({ where: { userId, deletedAt: null } }),
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

  fastify.get(
    '/assets/:assetId/file',
    {
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      const { assetId } = request.params as { assetId: string };
      const asset = await prisma.projectAsset.findFirst({
        where: {
          id: assetId,
          project: {
            userId: request.user?.id,
            deletedAt: null,
          },
        },
        include: { project: true },
      });

      if (!asset) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Asset not found' },
        });
      }

      try {
        assertWorkspaceActive(
          asset.project.lifecycleStatus,
          asset.project.expiresAt,
          'Media project sudah expired.',
        );
      } catch (error) {
        if (error instanceof WorkspaceLifecycleError) {
          return reply.status(410).send({
            success: false,
            error: { code: error.code, message: error.message },
          });
        }
        throw error;
      }

      const filePath = resolveProjectAssetPath(asset.projectId, asset.r2Key);
      try {
        const fileStats = await stat(filePath);
        return reply
          .type(metadataString(asset.metadata, 'mimeType') ?? 'application/octet-stream')
          .header('Content-Length', fileStats.size)
          .header('Cache-Control', 'private, max-age=600')
          .header('Cross-Origin-Resource-Policy', 'cross-origin')
          .header('X-Content-Type-Options', 'nosniff')
          .send(createReadStream(filePath));
      } catch {
        return reply.status(410).send({
          success: false,
          error: { code: 'ASSET_EXPIRED', message: 'Media file sudah tidak tersedia.' },
        });
      }
    },
  );

  fastify.post(
    '/:id/assets/from-upload-token',
    {
      preHandler: [requireAuth],
    },
    handleAttachFromUploadToken,
  );

  fastify.post(
    '/:id/assets/from-studio-asset',
    {
      preHandler: [requireAuth],
    },
    handleAttachFromStudioAsset,
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

      try {
        assertWorkspaceActive(
          project.lifecycleStatus,
          project.expiresAt,
          'Project sudah expired. Mulai project baru atau cek Riwayat.',
        );
      } catch (error) {
        if (error instanceof WorkspaceLifecycleError) {
          return reply.status(410).send({
            success: false,
            error: { code: error.code, message: error.message },
          });
        }
        throw error;
      }

      await prisma.project.update({
        where: { id: project.id },
        data: { lastOpenedAt: new Date() },
      });

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
          lifecycleStatus: LifecycleStatus.ACTIVE,
          expiresAt: getActiveDraftExpiresAt(),
        },
        include: {
          assets: true,
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

      try {
        assertWorkspaceActive(
          existing.lifecycleStatus,
          existing.expiresAt,
          'Project sudah expired. Buat duplicate dari Riwayat jika masih tersedia.',
        );
      } catch (error) {
        if (error instanceof WorkspaceLifecycleError) {
          return reply.status(410).send({
            success: false,
            error: { code: error.code, message: error.message },
          });
        }
        throw error;
      }

      const project = await prisma.project.update({
        where: { id },
        data: {
          ...body,
          storyData: body.storyData as Prisma.InputJsonValue,
          lifecycleStatus: LifecycleStatus.ACTIVE,
          expiresAt: getActiveDraftExpiresAt(),
        },
        include: {
          assets: true,
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

      await prisma.project.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          lifecycleStatus: LifecycleStatus.DELETED,
        },
      });

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
