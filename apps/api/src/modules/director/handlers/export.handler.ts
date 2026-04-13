/**
 * @module director/handlers/export
 * @description BullMQ job handler for AI Director video export.
 *
 * This handler:
 * - Collects selected clips with trim settings
 * - Concatenates clips using FFmpeg
 * - Optionally burns in subtitles from transcripts
 * - Generates final export file
 *
 * Job Type: EXPORT
 */

import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { basename, join } from 'node:path';
import type { Job } from 'bullmq';
import { env } from '@/config/env';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { directorProcessor } from '../director.processor';
import type { DirectorExportJobData } from '../director.queue';
import { type BuiltExportClip, buildExportClipFromSelectedClip } from '../export-clip-builder';

/**
 * Processes a video export job for the AI Director.
 *
 * @param job - BullMQ job containing session and export options
 * @returns Object containing the output filename
 * @throws Error if session/asset not found or FFmpeg fails
 */

export async function processExportJob(job: Job<DirectorExportJobData>) {
  const { sessionId, options } = job.data;
  const logCtx = { jobId: job.id, sessionId, type: 'EXPORT' };
  logger.info(logCtx, 'Processing export job');

  await job.updateProgress(5);

  const session = await prisma.directorSession.findUnique({
    where: { id: sessionId },
    include: {
      selectedClips: {
        include: {
          candidate: true,
          transcript: true,
        },
        orderBy: { orderIndex: 'asc' },
      },
      exportJob: true,
      subtitleStyle: true,
    },
  });

  if (!session || !session.exportJob) {
    throw new Error('Session or export job not found');
  }

  if (session.selectedClips.length !== 1) {
    throw new Error('Ekspor hanya mendukung 1 klip untuk 1 short');
  }

  const exportJobId = session.exportJob.id;

  try {
    await prisma.directorExportJob.update({
      where: { id: exportJobId },
      data: { status: 'PROCESSING' },
    });
    await job.updateProgress(12);

    const asset = await prisma.directorAsset.findUnique({
      where: { sessionId },
    });

    if (!asset) {
      throw new Error('Session asset not found');
    }

    const fileName = basename(asset.storageKey);
    const sourcePath = join(env.MEDIA_INPUT_DIR, 'director', fileName);

    if (!existsSync(sourcePath)) {
      throw new Error(`Asset file missing: ${sourcePath}`);
    }

    const clipsToExport: BuiltExportClip[] = [];
    const subtitleStyle = session.subtitleStyle
      ? {
          fontToken: session.subtitleStyle.fontToken,
          textColorToken: session.subtitleStyle.textColorToken,
          bgColorToken: session.subtitleStyle.bgColorToken,
          fontSize: session.subtitleStyle.fontSize,
          position: session.subtitleStyle.position,
          animation: session.subtitleStyle.animation,
        }
      : undefined;
    const startExportClips = session.selectedClips.slice(0, 1);
    await job.updateProgress(20);

    for (const clip of startExportClips) {
      clipsToExport.push(
        buildExportClipFromSelectedClip({
          clip: {
            id: clip.id,
            trimStartMs: clip.trimStartMs,
            trimEndMs: clip.trimEndMs,
            candidate: {
              startMs: clip.candidate.startMs,
              endMs: clip.candidate.endMs,
              metadata: clip.candidate.metadata,
            },
            transcript: clip.transcript?.segments
              ? {
                  segments: clip.transcript.segments as Array<{
                    startMs: number;
                    endMs: number;
                    text: string;
                    speaker?: string;
                    words?: Array<{
                      startMs: number;
                      endMs: number;
                      text: string;
                      confidence?: number;
                      speaker?: string;
                    }>;
                  }>,
                }
              : undefined,
          },
          sourcePath,
          settings: options.refineSettings?.[clip.id],
        }),
      );
    }

    if (clipsToExport.length === 0) {
      throw new Error('Tidak ada klip valid untuk diekspor');
    }

    await job.updateProgress(35);

    const outputDir = join(env.MEDIA_INPUT_DIR, 'director', 'exports');
    if (!existsSync(outputDir)) {
      await mkdir(outputDir, { recursive: true });
    }
    await job.updateProgress(45);

    const finalFile = await directorProcessor.exportVideo(clipsToExport, outputDir, {
      ...options,
      subtitleStyle,
    });
    await job.updateProgress(92);

    await job.updateProgress(100);

    const outputStorageKey = `director/exports/${finalFile}`;
    await prisma.directorExportJob.update({
      where: { id: exportJobId },
      data: {
        status: 'COMPLETED',
        outputStorageKey,
      },
    });

    logger.info({ ...logCtx, finalFile }, 'Export job completed');
    return { output: finalFile };
  } catch (err) {
    logger.error({ ...logCtx, err }, 'Export job failed');

    await prisma.directorExportJob.update({
      where: { id: exportJobId },
      data: {
        status: 'FAILED',
        errorMessage: err instanceof Error ? err.message : 'Unknown error',
      },
    });
    throw err;
  }
}
