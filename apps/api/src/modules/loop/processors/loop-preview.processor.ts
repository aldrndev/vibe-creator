import { existsSync } from 'node:fs';
import { mkdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { env } from '@/config/env';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { WORKSPACE_RETENTION_MS } from '@/modules/workspace/workspace-lifecycle';
import { getVideoDuration, getVideoResolution, hasVideoAudioStream } from '@/utils/video-info';
import { loopRenderSpecSchema } from '../loop.schemas';
import { publishLoopPreviewEvent } from '../loop-preview.events';
import { renderLoopCycle } from './loop-render.processor';

const PREVIEW_OUTPUT_DIR = join(env.MEDIA_INPUT_DIR, 'temp', 'loop-previews');
const DURATION_TOLERANCE_MS = 250;

export async function processLoopPreviewJob(previewId: string): Promise<void> {
  await mkdir(PREVIEW_OUTPUT_DIR, { recursive: true });
  const preview = await prisma.loopPreview.findUnique({ where: { id: previewId } });
  if (!preview) {
    throw new Error('Loop preview record not found');
  }
  const spec = loopRenderSpecSchema.parse(preview.renderSpec);
  const outputPath = join(PREVIEW_OUTPUT_DIR, `${preview.id}.mp4`);

  await prisma.loopPreview.update({
    where: { id: preview.id },
    data: { status: 'PROCESSING', phase: 'VALIDATING', progress: 0 },
  });

  try {
    await reportProgress(preview.id, 10, 'RENDERING');
    await renderLoopCycle({
      spec,
      outputPath,
      audioCodec: 'aac',
      onProgress: (progress) => {
        void reportProgress(preview.id, 10 + Math.round(progress * 0.8), 'RENDERING');
      },
    });
    await reportProgress(preview.id, 90, 'FINALIZING');
    await verifyPreviewOutput(spec, outputPath);
    const completedAt = new Date();
    const expiresAt = new Date(completedAt.getTime() + WORKSPACE_RETENTION_MS.previewCache);
    await prisma.loopPreview.update({
      where: { id: preview.id },
      data: {
        status: 'COMPLETED',
        phase: 'COMPLETED',
        progress: 100,
        localPath: outputPath,
        completedAt,
        expiresAt,
      },
    });
    await publishLoopPreviewEvent({
      type: 'completed',
      previewId: preview.id,
      status: 'COMPLETED',
      progress: 100,
      previewUrl: `/api/v1/loop/previews/${preview.id}/file`,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    logger.error({ error, previewId }, 'Loop preview processing failed');
    await prisma.loopPreview.update({
      where: { id: preview.id },
      data: {
        status: 'FAILED',
        phase: 'FAILED',
        errorMessage: 'Preview loop belum dapat dibuat.',
      },
    });
    await publishLoopPreviewEvent({
      type: 'failed',
      previewId: preview.id,
      status: 'FAILED',
      errorMessage: 'Preview loop belum dapat dibuat.',
    });
    throw error;
  }
}

async function reportProgress(previewId: string, progress: number, phase: string): Promise<void> {
  const result = await prisma.loopPreview.updateMany({
    where: { id: previewId, status: 'PROCESSING', progress: { lt: progress } },
    data: { progress, phase },
  });
  if (result.count > 0) {
    await publishLoopPreviewEvent({
      type: 'progress',
      previewId,
      status: 'PROCESSING',
      progress,
      phase,
      message: phase === 'FINALIZING' ? 'Menyiapkan preview loop.' : 'Membuat preview seamless.',
    });
  }
}

async function verifyPreviewOutput(
  spec: ReturnType<typeof loopRenderSpecSchema.parse>,
  outputPath: string,
): Promise<void> {
  if (!existsSync(outputPath)) {
    throw new Error('Preview output file missing');
  }
  const [durationMs, resolution, hasAudio, outputStat] = await Promise.all([
    getVideoDuration(outputPath),
    getVideoResolution(outputPath),
    hasVideoAudioStream(outputPath),
    stat(outputPath),
  ]);
  if (
    outputStat.size === 0 ||
    Math.abs(durationMs - spec.cycleDurationMs) > DURATION_TOLERANCE_MS
  ) {
    throw new Error('Preview output duration invalid');
  }
  if (resolution.width !== spec.outputWidth || resolution.height !== spec.outputHeight) {
    throw new Error('Preview output resolution invalid');
  }
  if (hasAudio !== (spec.sourceHasAudio && !spec.audioMuted)) {
    throw new Error('Preview output audio invalid');
  }
}
