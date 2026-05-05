/**
 * Video Export Service
 * Handles final video assembly and export.
 */

import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { logger } from '@/lib/logger';
import { faceTrackRunner } from './face-track-runner';
import {
  buildClipProcessingArgs,
  buildTrackedClipProcessingArgs,
  getAspectRatioFilter,
  getRenderProfile,
  shouldUseFaceTracking,
} from './video-export-render';
import {
  buildSubtitlesFilter,
  createSubtitleAsset,
  isMissingSubtitlesFilterError,
  type SubtitleStyleOptions,
} from './video-export-subtitles';

const ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg';
const STABILIZE_FILTER = 'deshake=rx=16:ry=16:edge=mirror';

function isMissingDeshakeFilterError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.message.includes("No such filter: 'deshake'") ||
    error.message.includes('Filter not found')
  );
}

export interface ExportClip {
  sourcePath: string;
  start: number;
  end: number;
  faceTracking?: boolean;
  focusProfile?: 'auto' | 'subject-center' | 'object-center';
  stabilize?: boolean;
  transcript?: {
    segments?: Array<{
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
    }>;
  };
}

export interface ExportVideoOptions {
  includeSubtitles?: boolean;
  normalizeAudio?: boolean;
  aspectRatio?: '9:16' | '16:9' | '1:1';
  quality?: '720p' | '1080p';
  subtitleStyle?: SubtitleStyleOptions;
  onProgress?: (progressPercent: number) => void;
}

export interface ExportClipState {
  canBurnSubtitles: boolean;
}

interface FaceTrackingContext {
  clip: ExportClip;
  clipIndex: number;
  clipId: string;
  outputDir: string;
  profile: ReturnType<typeof getRenderProfile>;
  aspectRatioFilter: string;
}

async function prepareFaceTracking(
  context: FaceTrackingContext,
  service: typeof videoExportService,
  tempPaths: string[],
  baseVideoFilters: string[],
): Promise<{ trackVideoPath: string; trackAudioPath: string }> {
  const { join } = await import('node:path');
  const trackAudioPath = join(
    context.outputDir,
    `temp_track_source_${context.clipIndex}_${context.clipId}.mp4`,
  );
  const trackVideoPath = join(
    context.outputDir,
    `temp_track_video_${context.clipIndex}_${context.clipId}.mp4`,
  );
  tempPaths.push(trackAudioPath, trackVideoPath);

  try {
    await service.createFaceTrackingSourceClip(context.clip, trackAudioPath);
    const trackingResult = await faceTrackRunner.trackPortraitClip({
      inputPath: trackAudioPath,
      outputPath: trackVideoPath,
      targetWidth: context.profile.width,
      targetHeight: context.profile.heightPortrait,
      focusProfile: context.clip.focusProfile ?? 'auto',
    });

    if (!trackingResult.success) {
      throw new Error(trackingResult.error || 'Face tracking gagal dijalankan');
    }

    logger.info(
      {
        clipIndex: context.clipIndex,
        detections: trackingResult.detections,
        objectDetections: trackingResult.objectDetections,
        frames: trackingResult.frames,
        multiFaceFrames: trackingResult.multiFaceFrames,
        maxFacesInFrame: trackingResult.maxFacesInFrame,
        targetSwitches: trackingResult.targetSwitches,
        snapRepositions: trackingResult.snapRepositions,
        sceneCuts: trackingResult.sceneCuts,
        focusProfile: trackingResult.focusProfile,
        trackingPreset: trackingResult.trackingPreset,
        detectorsUsed: trackingResult.detectorsUsed,
      },
      'Face tracking applied to export clip',
    );
    baseVideoFilters.push('setsar=1');
    return { trackVideoPath, trackAudioPath };
  } catch (error) {
    logger.warn(
      {
        clipIndex: context.clipIndex,
        error: error instanceof Error ? error.message : String(error),
      },
      'Face tracking failed, falling back to static portrait crop',
    );
    baseVideoFilters.push(context.aspectRatioFilter);
    return { trackVideoPath: '', trackAudioPath: '' };
  }
}

interface FfmpegRetryContext {
  clip: ExportClip;
  clipIndex: number;
  clipOutPath: string;
  quality: '720p' | '1080p';
  options: ExportVideoOptions;
  state: ExportClipState;
  trackVideoPath: string;
  trackAudioPath: string;
  baseVideoFilters: string[];
  subtitleFilter: string | null;
  hasTranscript: boolean;
}

function buildFfmpegArgs(
  ctx: FfmpegRetryContext,
  shouldUseStabilize: boolean,
  shouldIncludeSubtitles: boolean,
): string[] {
  const vfFilters = [...ctx.baseVideoFilters];
  if (shouldUseStabilize) {
    vfFilters.push(STABILIZE_FILTER);
  }
  if (shouldIncludeSubtitles && ctx.subtitleFilter) {
    vfFilters.push(ctx.subtitleFilter);
  }

  if (ctx.trackVideoPath && ctx.trackAudioPath) {
    return buildTrackedClipProcessingArgs(
      ctx.trackVideoPath,
      ctx.trackAudioPath,
      ctx.clipOutPath,
      vfFilters,
      ctx.quality,
      ctx.options.normalizeAudio ?? true,
    );
  }

  return buildClipProcessingArgs(
    ctx.clip,
    ctx.clipOutPath,
    vfFilters,
    ctx.quality,
    ctx.options.normalizeAudio ?? true,
  );
}

function handleFfmpegError(
  error: unknown,
  ctx: FfmpegRetryContext,
  shouldIncludeSubtitles: boolean,
  shouldUseStabilize: boolean,
): { retry: boolean; dropSubtitles: boolean; dropStabilize: boolean } {
  const missingSub =
    ctx.hasTranscript &&
    shouldIncludeSubtitles &&
    ctx.state.canBurnSubtitles &&
    isMissingSubtitlesFilterError(error);
  if (missingSub) {
    logger.warn(
      { clipIndex: ctx.clipIndex, clipOutPath: ctx.clipOutPath },
      'FFmpeg subtitles filter unavailable, retrying export clip without burned subtitles',
    );
    return { retry: true, dropSubtitles: true, dropStabilize: false };
  }

  const missingDeshake = shouldUseStabilize && isMissingDeshakeFilterError(error);
  if (missingDeshake) {
    logger.warn(
      { clipIndex: ctx.clipIndex, clipOutPath: ctx.clipOutPath },
      'FFmpeg deshake filter unavailable, retrying export clip without stabilization',
    );
    return { retry: true, dropSubtitles: false, dropStabilize: true };
  }

  return { retry: false, dropSubtitles: false, dropStabilize: false };
}

async function executeFfmpegClipWithRetries(
  ctx: FfmpegRetryContext,
  service: typeof videoExportService,
): Promise<void> {
  let shouldIncludeSubtitles = Boolean(ctx.subtitleFilter);
  let shouldUseStabilize = Boolean(ctx.clip.stabilize);

  while (true) {
    const args = buildFfmpegArgs(ctx, shouldUseStabilize, shouldIncludeSubtitles);
    logger.info({ clipIndex: ctx.clipIndex, args: args.join(' ') }, 'Processing export clip');

    try {
      await service.runFfmpeg(args, `Clip ${ctx.clipIndex + 1} gagal diproses`);
      break;
    } catch (error) {
      const { retry, dropSubtitles, dropStabilize } = handleFfmpegError(
        error,
        ctx,
        shouldIncludeSubtitles,
        shouldUseStabilize,
      );

      if (!retry) {
        throw error;
      }

      if (dropSubtitles) {
        shouldIncludeSubtitles = false;
        ctx.state.canBurnSubtitles = false;
      }

      if (dropStabilize) {
        shouldUseStabilize = false;
      }
    }
  }
}

async function processSingleExportClip(
  clip: ExportClip,
  i: number,
  outputDir: string,
  options: ExportVideoOptions,
  state: ExportClipState,
  service: typeof videoExportService,
): Promise<string> {
  const fs = await import('node:fs/promises');
  const { join } = await import('node:path');

  const clipId = randomUUID();
  const clipOutPath = join(outputDir, `temp_clip_${i}_${clipId}.mp4`);
  const tempPaths: string[] = [];
  const quality = options.quality ?? '1080p';
  const profile = getRenderProfile(quality);
  const baseVideoFilters: string[] = [];
  let trackVideoPath = '';
  let trackAudioPath = '';

  const transcriptSegments = clip.transcript?.segments;
  const hasTranscript = Boolean(transcriptSegments?.length);
  const useFaceTracking = shouldUseFaceTracking(clip.faceTracking, options.aspectRatio);
  const aspectRatioFilter = getAspectRatioFilter(options.aspectRatio, quality);

  if (useFaceTracking) {
    const trackingPaths = await prepareFaceTracking(
      { clip, clipIndex: i, clipId, outputDir, profile, aspectRatioFilter },
      service,
      tempPaths,
      baseVideoFilters,
    );
    trackVideoPath = trackingPaths.trackVideoPath;
    trackAudioPath = trackingPaths.trackAudioPath;
  } else {
    baseVideoFilters.push(aspectRatioFilter);
  }

  let subtitleFilter: string | null = null;
  if (state.canBurnSubtitles && transcriptSegments?.length) {
    const subtitleAsset = createSubtitleAsset(transcriptSegments, options.subtitleStyle);
    const subtitlePath = join(outputDir, `temp_sub_${i}_${clipId}.${subtitleAsset.extension}`);
    tempPaths.push(subtitlePath);
    await fs.writeFile(subtitlePath, subtitleAsset.content);
    subtitleFilter = buildSubtitlesFilter(
      subtitlePath,
      options.subtitleStyle,
      subtitleAsset.useForceStyle,
    );
  }

  try {
    await executeFfmpegClipWithRetries(
      {
        clip,
        clipIndex: i,
        clipOutPath,
        quality,
        options,
        state,
        trackVideoPath,
        trackAudioPath,
        baseVideoFilters,
        subtitleFilter,
        hasTranscript,
      },
      service,
    );
  } finally {
    for (const tempPath of tempPaths) {
      if (tempPath && existsSync(tempPath)) {
        await fs.unlink(tempPath).catch(() => {});
      }
    }
  }

  return clipOutPath;
}
export const videoExportService = {
  async runFfmpeg(args: string[], errorPrefix: string): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const proc = spawn(ffmpegPath, args);
      let stderr = '';

      proc.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
      });

      proc.on('close', (code) => {
        if (code === 0) {
          resolve();
          return;
        }

        const detail = stderr.trim().split('\n').slice(-6).join('\n');
        reject(new Error(detail ? `${errorPrefix}: ${detail}` : `${errorPrefix}: ${code}`));
      });
    });
  },

  async createFaceTrackingSourceClip(
    clip: Pick<ExportClip, 'sourcePath' | 'start' | 'end'>,
    outputPath: string,
  ): Promise<void> {
    const duration = clip.end - clip.start;
    await this.runFfmpeg(
      [
        '-y',
        '-ss',
        clip.start.toFixed(3),
        '-i',
        clip.sourcePath,
        '-t',
        duration.toFixed(3),
        '-c:v',
        'libx264',
        '-preset',
        'veryfast',
        '-crf',
        '18',
        '-pix_fmt',
        'yuv420p',
        '-c:a',
        'aac',
        '-b:a',
        '192k',
        '-movflags',
        '+faststart',
        outputPath,
      ],
      'Persiapan klip face tracking gagal',
    );
  },

  async exportVideo(
    clips: ExportClip[],
    outputDir: string,
    options: ExportVideoOptions = {},
  ): Promise<string> {
    const { join } = await import('node:path');
    const fs = await import('node:fs/promises');

    const clipPaths: string[] = [];
    const state: ExportClipState = { canBurnSubtitles: Boolean(options.includeSubtitles) };

    for (let i = 0; i < clips.length; i++) {
      const clip = clips[i];
      if (!clip) {
        continue;
      }

      const clipOutPath = await processSingleExportClip(clip, i, outputDir, options, state, this);
      clipPaths.push(clipOutPath);
    }

    const listPath = join(outputDir, `concat_${randomUUID()}.txt`);
    const fileContent = clipPaths.map((filePath) => `file '${filePath}'`).join('\n');
    await fs.writeFile(listPath, fileContent);

    const finalName = `export_${randomUUID()}.mp4`;
    const finalPath = join(outputDir, finalName);

    await this.runFfmpeg(
      ['-y', '-f', 'concat', '-safe', '0', '-i', listPath, '-c', 'copy', finalPath],
      'Penggabungan klip export gagal',
    );

    await fs.unlink(listPath).catch(() => {});
    for (const clipPath of clipPaths) {
      if (existsSync(clipPath)) {
        await fs.unlink(clipPath).catch(() => {});
      }
    }

    return finalName;
  },
  buildClipProcessingArgs,
  buildTrackedClipProcessingArgs,
  shouldUseFaceTracking: (
    clip: Pick<ExportClip, 'faceTracking'>,
    aspectRatio?: '9:16' | '16:9' | '1:1',
  ) => shouldUseFaceTracking(clip.faceTracking, aspectRatio),
  isMissingDeshakeFilterError,
  getStabilizeFilter: () => STABILIZE_FILTER,
  getAspectRatioFilter,
  getRenderProfile,
};
