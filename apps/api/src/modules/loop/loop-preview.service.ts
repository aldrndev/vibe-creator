import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { WORKSPACE_RETENTION_MS } from '@/modules/workspace/workspace-lifecycle';
import {
  type LoopRenderSpec,
  loopPreviewResponseSchema,
  loopRenderSpecSchema,
} from './loop.schemas';
import { addLoopPreviewJob } from './loop-preview.queue';
import { resolveLoopRenderSpec } from './loop-render.service';

interface CreatePreviewInput {
  readonly projectId: string;
  readonly userId: string;
  readonly isAdmin: boolean;
  readonly requestId: string;
}

export class LoopPreviewServiceError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly statusCode = 400,
  ) {
    super(message);
    this.name = 'LoopPreviewServiceError';
  }
}

export const loopPreviewService = {
  async create(input: CreatePreviewInput) {
    const resolved = await resolveLoopRenderSpec(input);
    const spec = loopRenderSpecSchema.parse({
      ...resolved.spec,
      cycleCount: 1,
      targetDurationMs: resolved.spec.cycleDurationMs,
      actualDurationMs: resolved.spec.cycleDurationMs,
    });
    const fingerprint = createPreviewFingerprint(spec, resolved.assetId);
    const now = new Date();
    const reusable = await prisma.loopPreview.findFirst({
      where: {
        userId: input.userId,
        projectId: input.projectId,
        fingerprint,
        expiresAt: { gt: now },
        status: { in: ['QUEUED', 'PROCESSING', 'COMPLETED'] },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (
      reusable &&
      (reusable.status !== 'COMPLETED' ||
        (Boolean(reusable.localPath) && existsSync(reusable.localPath ?? '')))
    ) {
      return toPreviewResponse(reusable, true);
    }

    const expiresAt = new Date(now.getTime() + WORKSPACE_RETENTION_MS.previewCache);
    const preview = await prisma.loopPreview.create({
      data: {
        projectId: input.projectId,
        userId: input.userId,
        fingerprint,
        renderSpec: spec as Prisma.InputJsonValue,
        expiresAt,
      },
    });
    try {
      await addLoopPreviewJob({
        previewId: preview.id,
        userId: input.userId,
        requestId: input.requestId,
      });
    } catch {
      await prisma.loopPreview.update({
        where: { id: preview.id },
        data: { status: 'FAILED', phase: 'FAILED', errorMessage: 'PREVIEW_QUEUE_UNAVAILABLE' },
      });
      throw new LoopPreviewServiceError(
        'Preview loop belum dapat dibuat. Coba lagi.',
        'PREVIEW_FAILED',
        503,
      );
    }
    return toPreviewResponse(preview, false);
  },

  async getOwned(previewId: string, userId: string) {
    const preview = await prisma.loopPreview.findFirst({ where: { id: previewId, userId } });
    if (!preview) {
      throw new LoopPreviewServiceError('Preview tidak ditemukan.', 'NOT_FOUND', 404);
    }
    if (preview.expiresAt <= new Date() && preview.status !== 'EXPIRED') {
      return prisma.loopPreview.update({
        where: { id: preview.id },
        data: { status: 'EXPIRED', phase: 'EXPIRED' },
      });
    }
    return preview;
  },

  async getStatus(previewId: string, userId: string) {
    return toPreviewResponse(await this.getOwned(previewId, userId), false);
  },

  async getFile(previewId: string, userId: string) {
    const preview = await this.getOwned(previewId, userId);
    if (preview.status === 'EXPIRED') {
      throw new LoopPreviewServiceError('Preview sudah expired.', 'PREVIEW_EXPIRED', 410);
    }
    if (preview.status !== 'COMPLETED' || !preview.localPath || !existsSync(preview.localPath)) {
      throw new LoopPreviewServiceError('Preview belum siap.', 'PREVIEW_NOT_READY', 409);
    }
    return preview;
  },
};

export function createPreviewFingerprint(spec: LoopRenderSpec, assetId: string): string {
  const parsed = loopRenderSpecSchema.parse(spec);
  return createHash('sha256')
    .update(
      JSON.stringify({
        assetId,
        trimStartMs: parsed.trimStartMs,
        trimEndMs: parsed.trimEndMs,
        audioMuted: parsed.audioMuted,
        transitionMode: parsed.transitionMode,
        transitionDurationMs: parsed.transitionDurationMs,
        aspectRatio: parsed.aspectRatio,
        width: parsed.outputWidth,
        height: parsed.outputHeight,
      }),
    )
    .digest('hex');
}

function toPreviewResponse(
  preview: {
    id: string;
    status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'EXPIRED';
    progress: number;
    phase: string;
    expiresAt: Date;
    errorMessage: string | null;
  },
  reused: boolean,
) {
  return loopPreviewResponseSchema.parse({
    previewId: preview.id,
    status: preview.status,
    progress: preview.progress,
    phase: preview.phase,
    reused,
    previewUrl:
      preview.status === 'COMPLETED' ? `/api/v1/loop/previews/${preview.id}/file` : undefined,
    expiresAt: preview.expiresAt.toISOString(),
    errorMessage: preview.errorMessage ?? undefined,
  });
}
