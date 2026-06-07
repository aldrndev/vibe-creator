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
import {
  getCompletedSessionExpiresAt,
  getExportDownloadExpiresAt,
} from '@/modules/workspace/workspace-lifecycle';
import { directorProcessor } from '../director.processor';
import type { DirectorExportJobData } from '../director.queue';
import { type BuiltExportClip, buildExportClipFromSelectedClip } from '../export-clip-builder';
import {
  normalizeSubtitleSpeakerStyles,
  type SubtitleStyleOptions,
} from '../processing/video-export-subtitles';

const subtitlePositionValues = ['top', 'center', 'bottom'] as const;
const defaultViralPopSubtitleStyle = {
  stylePreset: 'viral-pop',
  fontToken: 'F_DISPLAY',
  fontFamily: 'League Spartan',
  textColorToken: 'C_YELLOW',
  bgColorToken: 'BG_TRANSPARENT',
  fontSize: 52,
  position: 'center' as const,
  animation: 'pop-word',
  speakerMode: 'single',
  speakerStyles: [],
};

function resolveSubtitlePosition(position: string): SubtitleStyleOptions['position'] {
  if (subtitlePositionValues.includes(position as (typeof subtitlePositionValues)[number])) {
    return position as SubtitleStyleOptions['position'];
  }

  if (position === 'cinema-bottom' || position === 'safe-bottom' || position === 'lower-third') {
    return 'bottom';
  }

  return undefined;
}

function buildExportSubtitleStyle(
  style: {
    fontToken: string;
    fontFamily?: string | null;
    stylePreset: string;
    textColorToken: string;
    bgColorToken: string;
    fontSize: number;
    position: string;
    animation: string;
    speakerMode: string;
    speakerStyles: unknown;
  } | null,
  options: DirectorExportJobData['options'],
  contentMode: SubtitleStyleOptions['contentMode'],
): SubtitleStyleOptions {
  const baseStyle = style
    ? {
        fontToken: style.fontToken,
        fontFamily: style.fontFamily ?? undefined,
        stylePreset: style.stylePreset,
        textColorToken: style.textColorToken,
        bgColorToken: style.bgColorToken,
        fontSize: style.fontSize,
        position: resolveSubtitlePosition(style.position),
        animation: style.animation,
        speakerMode: style.speakerMode,
        speakerStyles: normalizeSubtitleSpeakerStyles(style.speakerStyles),
      }
    : defaultViralPopSubtitleStyle;

  return {
    ...baseStyle,
    contentMode,
    aspectRatio: options.aspectRatio ?? '9:16',
    quality: options.quality ?? '1080p',
  };
}

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

  if (!session?.exportJob) {
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

    const primaryClip = clipsToExport[0];
    const subtitleStyle = buildExportSubtitleStyle(
      session.subtitleStyle,
      options,
      primaryClip?.resolvedContentMode,
    );

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
      onProgress: (ffmpegPercent: number) => {
        // Map FFmpeg progress (0-100) to job progress (45-92)
        const mapped = Math.round(45 + (ffmpegPercent / 100) * 47);
        void job.updateProgress(Math.min(92, mapped));
      },
    });
    await job.updateProgress(92);

    await job.updateProgress(100);

    const outputStorageKey = `director/exports/${finalFile}`;
    const completedAt = new Date();
    await prisma.$transaction(async (tx) => {
      await tx.directorExportJob.update({
        where: { id: exportJobId },
        data: {
          status: 'COMPLETED',
          outputStorageKey,
          completedAt,
          downloadExpiresAt: getExportDownloadExpiresAt(completedAt),
        },
      });
      await tx.directorSession.update({
        where: { id: sessionId },
        data: {
          step: 'COMPLETED',
          lifecycleStatus: 'COMPLETED',
          completedAt,
          expiresAt: getCompletedSessionExpiresAt(completedAt),
        },
      });
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
