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
import { applyClipRefineSettings, resolveClipRefineSettings } from '../clip-refine';
import { directorProcessor } from '../director.processor';
import type { DirectorExportJobData } from '../director.queue';
import { resolveSelectedClipRangeMs } from '../selected-clip-range';

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

  await job.updateProgress(10);

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

  const exportJobId = session.exportJob.id;

  try {
    await prisma.directorExportJob.update({
      where: { id: exportJobId },
      data: { status: 'PROCESSING' },
    });

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

    const clipsToExport: Array<{
      sourcePath: string;
      start: number;
      end: number;
      faceTracking?: boolean;
      transcript?: {
        segments?: Array<{
          startMs: number;
          endMs: number;
          text: string;
          words?: Array<{
            startMs: number;
            endMs: number;
            text: string;
            confidence?: number;
          }>;
        }>;
      };
    }> = [];
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
    const startExportClips = session.selectedClips;

    for (const clip of startExportClips) {
      const clipRange = resolveSelectedClipRangeMs({
        candidateStartMs: clip.candidate.startMs,
        candidateEndMs: clip.candidate.endMs,
        trimStartMs: clip.trimStartMs,
        trimEndMs: clip.trimEndMs,
      });

      const transcriptData = clip.transcript?.segments
        ? {
            segments: clip.transcript.segments as Array<{
              startMs: number;
              endMs: number;
              text: string;
              words?: Array<{
                startMs: number;
                endMs: number;
                text: string;
                confidence?: number;
              }>;
            }>,
          }
        : undefined;

      const candidateMetadata =
        typeof clip.candidate.metadata === 'object' &&
        clip.candidate.metadata !== null &&
        !Array.isArray(clip.candidate.metadata)
          ? (clip.candidate.metadata as {
              scoreBreakdown?: {
                contentModeSuggestion?: 'podcast' | 'talking-head' | 'cinematic' | 'general';
              };
            })
          : {};
      const resolvedRefineSettings = resolveClipRefineSettings(options.refineSettings?.[clip.id], {
        contentModeSuggestion: candidateMetadata.scoreBreakdown?.contentModeSuggestion,
      });

      const refinedClip = applyClipRefineSettings(
        {
          startMs: clipRange.startMs,
          endMs: clipRange.endMs,
          contentModeSuggestion: candidateMetadata.scoreBreakdown?.contentModeSuggestion,
          transcript: transcriptData,
        },
        resolvedRefineSettings,
      );

      clipsToExport.push({
        sourcePath,
        start: refinedClip.startMs / 1000,
        end: refinedClip.endMs / 1000,
        faceTracking: resolvedRefineSettings.faceTracking,
        transcript: refinedClip.transcript,
      });
    }

    if (clipsToExport.length === 0) {
      throw new Error('Tidak ada klip valid untuk diekspor');
    }

    await job.updateProgress(30);

    const outputDir = join(env.MEDIA_INPUT_DIR, 'director', 'exports');
    if (!existsSync(outputDir)) {
      await mkdir(outputDir, { recursive: true });
    }

    const finalFile = await directorProcessor.exportVideo(clipsToExport, outputDir, {
      ...options,
      subtitleStyle,
    });

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
