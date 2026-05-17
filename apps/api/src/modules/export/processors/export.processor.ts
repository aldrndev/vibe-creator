/**
 * @module export/processors/export
 * @description Video export processing engine using FFmpeg.
 *
 * This processor handles the complete export pipeline:
 * 1. Trim clips to specified in/out points
 * 2. Apply transforms (position, scale, rotation, opacity)
 * 3. Apply effects (speed, volume, fade in/out, filters)
 * 4. Concatenate multiple clips into single output
 * 5. Render text overlays using FFmpeg drawtext filter
 * 6. Add watermark for free-tier users
 *
 * Progress is reported via database updates (0-100%).
 * Temp files are cleaned up after processing.
 */

import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { copyFile, mkdir, stat, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { env } from '@/config/env';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { paymentService } from '@/modules/payment/payment.service';
import { publishExportEvent } from '../export-events';
import { ffmpegProcessor } from '../ffmpeg.processor';
import { getTimelineDurationMs, mixAudioTracks } from './audio-track.processor';
import type { TimelineData } from './export-processor.types';
import {
  clampExportProgress,
  EXPORT_PROGRESS_RANGES,
  type ExportProgressRange,
  getClipProgressRange,
  mapSubProgressToOverall,
} from './export-progress';
import { createImageClip } from './image-clip.processor';
import { applyTextOverlays } from './text-overlay.processor';

/** Directory for temporary processing files */
const TEMP_DIR = join(env.MEDIA_INPUT_DIR, 'temp');

/** Directory for final export outputs */
const EXPORTS_DIR = join(env.MEDIA_INPUT_DIR, 'exports');
const EXPORT_RESULT_TTL_MS = 48 * 60 * 60 * 1000;

function createProgressReporter(jobId: string) {
  return async (progress: number): Promise<void> => {
    const roundedProgress = Math.round(clampExportProgress(progress));
    const phase = getPhaseForProgress(roundedProgress);

    const result = await prisma.exportHistory.updateMany({
      where: {
        id: jobId,
        status: 'PROCESSING',
        progress: { lt: roundedProgress },
      },
      data: {
        progress: roundedProgress,
        phase,
      },
    });

    if (result.count > 0) {
      await publishExportEvent({
        type: 'progress',
        jobId,
        status: 'PROCESSING',
        progress: roundedProgress,
        phase,
        message: getProgressMessage(phase),
      });
    }
  };
}

function mapClipSubPhaseProgress(
  clipRange: ExportProgressRange,
  subPhase: 'source' | 'effects',
  phasePercent: number,
): number {
  const midpoint = clipRange.start + (clipRange.end - clipRange.start) * 0.5;
  const range =
    subPhase === 'source'
      ? { start: clipRange.start, end: midpoint }
      : { start: midpoint, end: clipRange.end };

  return mapSubProgressToOverall(range, phasePercent);
}

/**
 * Processes a video export job.
 *
 * @param jobId - Export history record ID
 * @param addWatermark - Whether to add watermark (for free tier)
 * @throws Error if job not found or FFmpeg processing fails
 *
 * @example
 * ```ts
 * await processExportJob('job-uuid');
 * ```
 */

export async function processExportJob(jobId: string): Promise<void> {
  const reportProgress = createProgressReporter(jobId);

  // Ensure directories
  if (!existsSync(EXPORTS_DIR)) {
    await mkdir(EXPORTS_DIR, { recursive: true });
  }
  if (!existsSync(TEMP_DIR)) {
    await mkdir(TEMP_DIR, { recursive: true });
  }

  // Update status to processing
  await prisma.exportHistory.update({
    where: { id: jobId },
    data: {
      status: 'PROCESSING',
      startedAt: new Date(),
      attempts: { increment: 1 },
    },
  });

  try {
    await reportProgress(EXPORT_PROGRESS_RANGES.validating.start);
    await assertExportNotCancelled(jobId);

    const job = await prisma.exportHistory.findUnique({
      where: { id: jobId },
    });

    if (!job || !job.timelineData) {
      throw new Error('Job not found or missing timeline data');
    }

    const timelineData = job.timelineData as unknown as TimelineData;
    const addWatermark = job.addWatermark;
    const consumeQuotaOnSuccess = job.consumeQuotaOnSuccess;
    const tempFiles: string[] = [];
    const outputId = randomUUID();

    if (timelineData.clips.length === 0) {
      throw new Error('Export requires at least one video or image clip');
    }

    await reportProgress(EXPORT_PROGRESS_RANGES.validating.end);
    await assertExportNotCancelled(jobId);

    // Step 1: Trim and apply effects to each clip
    logger.info({ jobId }, 'Starting clip trimming and effects');
    for (let i = 0; i < timelineData.clips.length; i++) {
      await assertExportNotCancelled(jobId);
      const clip = timelineData.clips[i];
      if (!clip) continue;
      const mediaType = clip.mediaType ?? 'video';
      const backgroundMode = timelineData.settings.backgroundMode ?? 'solid';
      const backgroundColor = timelineData.settings.backgroundColor ?? '#000000';
      const backgroundBlurAmount = timelineData.settings.backgroundBlurAmount ?? 18;
      const backgroundBlurZoom = timelineData.settings.backgroundBlurZoom ?? 1.08;
      const backgroundDim = timelineData.settings.backgroundDim ?? 0.08;
      const backgroundSaturation = timelineData.settings.backgroundSaturation ?? 1.05;
      const clipRange = getClipProgressRange(i, timelineData.clips.length);
      const hasTransforms =
        clip.transforms &&
        (clip.transforms.x !== 0 ||
          clip.transforms.y !== 0 ||
          clip.transforms.scale !== 1 ||
          clip.transforms.rotation !== 0 ||
          clip.transforms.opacity !== 1);
      const hasEffects =
        clip.effects &&
        (clip.effects.speed !== 1 ||
          clip.effects.volume !== 1 ||
          clip.effects.fadeIn > 0 ||
          clip.effects.fadeOut > 0 ||
          (clip.effects.transitionIn && clip.effects.transitionIn !== 'none') ||
          (clip.effects.transitionOut && clip.effects.transitionOut !== 'none') ||
          (clip.effects.motion && clip.effects.motion !== 'none') ||
          (clip.effects.filters && clip.effects.filters.length > 0));
      const needsCanvasBackground = mediaType === 'video' && backgroundMode === 'blur';
      const needsEffectsPass = Boolean(hasTransforms || hasEffects || needsCanvasBackground);

      const trimmedPath = join(TEMP_DIR, `${outputId}_trimmed_${i}.mp4`);
      if (mediaType === 'image') {
        await createImageClip({
          inputPath: clip.localPath,
          outputPath: trimmedPath,
          durationSec: Math.max(0.1, clip.endTime - clip.startTime),
          width: timelineData.settings.width,
          height: timelineData.settings.height,
          fps: timelineData.settings.fps,
          backgroundColor,
          backgroundMode,
          backgroundBlurAmount,
          backgroundBlurZoom,
          backgroundDim,
          backgroundSaturation,
          onProgress: (percent) => {
            void reportProgress(mapSubProgressToOverall(clipRange, percent));
          },
        });
      } else {
        const sourceRange = needsEffectsPass
          ? {
              start: clipRange.start,
              end: clipRange.start + (clipRange.end - clipRange.start) * 0.5,
            }
          : clipRange;

        await ffmpegProcessor.trim({
          inputPath: clip.localPath,
          outputPath: trimmedPath,
          startTime: clip.startTime,
          endTime: clip.endTime,
          onProgress: (percent) => {
            void reportProgress(mapSubProgressToOverall(sourceRange, percent));
          },
        });
      }

      if (needsEffectsPass) {
        const effectsPath = join(TEMP_DIR, `${outputId}_effects_${i}.mp4`);
        const clipDurationMs = (clip.endTime - clip.startTime) * 1000;

        await ffmpegProcessor.applyEffects({
          inputPath: trimmedPath,
          outputPath: effectsPath,
          transforms: clip.transforms,
          effects: clip.effects,
          outputWidth: timelineData.settings.width,
          outputHeight: timelineData.settings.height,
          durationMs: clipDurationMs,
          background: {
            mode: backgroundMode,
            color: backgroundColor,
            blurAmount: backgroundBlurAmount,
            blurZoom: backgroundBlurZoom,
            dim: backgroundDim,
            saturation: backgroundSaturation,
          },
          onProgress: (percent) => {
            void reportProgress(mapClipSubPhaseProgress(clipRange, 'effects', percent));
          },
        });

        await unlink(trimmedPath);
        tempFiles.push(effectsPath);
      } else {
        tempFiles.push(trimmedPath);
      }

      await reportProgress(clipRange.end);
    }
    await assertExportNotCancelled(jobId);

    // Step 2: Concatenate clips
    logger.info({ jobId }, 'Starting concatenation');
    let outputPath = join(TEMP_DIR, `${outputId}_concat.mp4`);
    await reportProgress(EXPORT_PROGRESS_RANGES.concat.start);

    if (tempFiles.length > 1) {
      await ffmpegProcessor.concat({
        inputPaths: tempFiles,
        outputPath,
        onProgress: (percent) => {
          void reportProgress(mapSubProgressToOverall(EXPORT_PROGRESS_RANGES.concat, percent));
        },
      });
    } else if (tempFiles.length === 1 && tempFiles[0]) {
      outputPath = tempFiles[0];
    }

    await reportProgress(EXPORT_PROGRESS_RANGES.concat.end);
    await assertExportNotCancelled(jobId);

    // Step 2.5: Apply text overlays if any
    if (timelineData.textOverlays && timelineData.textOverlays.length > 0) {
      outputPath = await applyTextOverlays({
        inputPath: outputPath,
        textOverlays: timelineData.textOverlays,
        outputId,
        tempFiles,
        onProgress: (percent) => {
          void reportProgress(mapSubProgressToOverall(EXPORT_PROGRESS_RANGES.text, percent));
        },
      });
    }

    await reportProgress(EXPORT_PROGRESS_RANGES.text.end);
    await assertExportNotCancelled(jobId);

    if (timelineData.audioTracks && timelineData.audioTracks.length > 0) {
      logger.info(
        { jobId, audioTrackCount: timelineData.audioTracks.length },
        'Mixing audio tracks',
      );
      const mixedPath = await mixAudioTracks({
        inputPath: outputPath,
        outputPath: join(TEMP_DIR, `${outputId}_audio.mp4`),
        audioTracks: timelineData.audioTracks,
        durationMs: getTimelineDurationMs(timelineData),
        onProgress: (percent) => {
          void reportProgress(mapSubProgressToOverall(EXPORT_PROGRESS_RANGES.audio, percent));
        },
      });

      if (mixedPath !== outputPath) {
        outputPath = mixedPath;
        tempFiles.push(mixedPath);
      }
    }

    await reportProgress(EXPORT_PROGRESS_RANGES.audio.end);
    await assertExportNotCancelled(jobId);

    // Step 3: Add watermark (for free tier)
    const finalPath = join(EXPORTS_DIR, `${outputId}_final.mp4`);
    await reportProgress(EXPORT_PROGRESS_RANGES.finalizing.start);

    if (addWatermark) {
      logger.info({ jobId }, 'Adding watermark');
      await ffmpegProcessor.addWatermark({
        inputPath: outputPath,
        outputPath: finalPath,
        onProgress: (percent) => {
          void reportProgress(mapSubProgressToOverall(EXPORT_PROGRESS_RANGES.finalizing, percent));
        },
      });
    } else {
      await copyFile(outputPath, finalPath);
    }

    await reportProgress(EXPORT_PROGRESS_RANGES.finalizing.end);
    await assertExportNotCancelled(jobId);

    // Step 4: Cleanup temp files
    await reportProgress(EXPORT_PROGRESS_RANGES.cleanup.start);
    for (const tempFile of tempFiles) {
      try {
        await unlink(tempFile);
      } catch {
        // Ignore cleanup errors
      }
    }
    if (outputPath !== tempFiles[0]) {
      try {
        await unlink(outputPath);
      } catch {
        // Ignore cleanup errors
      }
    }
    await reportProgress(EXPORT_PROGRESS_RANGES.cleanup.end);

    // Mark as completed with download URL
    const downloadUrl = `/api/v1/export/${jobId}/download`;
    const fileStat = await stat(finalPath);
    const completedAt = new Date();
    const urlExpiresAt = new Date(completedAt.getTime() + EXPORT_RESULT_TTL_MS);

    await prisma.exportHistory.update({
      where: { id: jobId },
      data: {
        status: 'COMPLETED',
        progress: 100,
        phase: 'COMPLETED',
        phaseProgress: 100,
        localPath: finalPath,
        downloadUrl,
        fileSizeBytes: BigInt(fileStat.size),
        urlExpiresAt,
        expiresAt: urlExpiresAt,
        completedAt,
      },
    });

    await consumeSuccessfulExportQuota(job.userId, jobId, consumeQuotaOnSuccess);

    await publishExportEvent({
      type: 'completed',
      jobId,
      progress: 100,
      downloadUrl,
      filename: job.displayFilename ?? `video-studio-${jobId}.mp4`,
      completedAt: completedAt.toISOString(),
      urlExpiresAt: urlExpiresAt.toISOString(),
    });

    logger.info({ jobId, outputPath: finalPath }, 'Export completed');
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    logger.error({ err, jobId }, 'Export processing failed');
    await prisma.exportHistory.update({
      where: { id: jobId },
      data: {
        status: 'FAILED',
        phase: errorMessage === 'Export cancelled' ? 'CANCELLED' : 'FAILED',
        errorMessage,
      },
    });
    await publishExportEvent({
      type: 'failed',
      jobId,
      errorMessage,
    });
    if (errorMessage === 'Export cancelled') {
      return;
    }
    throw err;
  }
}

async function assertExportNotCancelled(jobId: string): Promise<void> {
  const job = await prisma.exportHistory.findUnique({
    where: { id: jobId },
    select: { phase: true },
  });

  if (job?.phase === 'CANCEL_REQUESTED' || job?.phase === 'CANCELLED') {
    throw new Error('Export cancelled');
  }
}

function getPhaseForProgress(progress: number): string {
  if (progress < EXPORT_PROGRESS_RANGES.validating.end) return 'VALIDATING';
  if (progress < EXPORT_PROGRESS_RANGES.clips.end) return 'RENDER_CLIPS';
  if (progress < EXPORT_PROGRESS_RANGES.concat.end) return 'CONCAT';
  if (progress < EXPORT_PROGRESS_RANGES.text.end) return 'TEXT_OVERLAY';
  if (progress < EXPORT_PROGRESS_RANGES.audio.end) return 'AUDIO_MIX';
  if (progress < EXPORT_PROGRESS_RANGES.finalizing.end) return 'FINALIZING';
  if (progress < EXPORT_PROGRESS_RANGES.cleanup.end) return 'CLEANUP';
  return 'READY';
}

function getProgressMessage(phase: string): string {
  switch (phase) {
    case 'VALIDATING':
      return 'Memvalidasi asset export.';
    case 'RENDER_CLIPS':
      return 'Merender clip dan effect.';
    case 'CONCAT':
      return 'Menggabungkan clip.';
    case 'TEXT_OVERLAY':
      return 'Menambahkan text overlay.';
    case 'AUDIO_MIX':
      return 'Mencampur audio.';
    case 'FINALIZING':
      return 'Finalisasi video.';
    case 'CLEANUP':
      return 'Membersihkan file sementara.';
    default:
      return 'Menyiapkan hasil export.';
  }
}

async function consumeSuccessfulExportQuota(
  userId: string,
  jobId: string,
  shouldConsume: boolean,
): Promise<void> {
  if (!shouldConsume) return;

  try {
    const result = await paymentService.consumeExportQuota(userId);
    if (!result.allowed) {
      logger.warn(
        { jobId, userId },
        'Export finished but quota was already exhausted before completion',
      );
    }
  } catch (err) {
    logger.error({ err, jobId, userId }, 'Failed to consume export quota after successful export');
  }
}
