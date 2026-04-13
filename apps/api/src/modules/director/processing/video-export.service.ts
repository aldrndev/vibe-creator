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
    options: {
      includeSubtitles?: boolean;
      normalizeAudio?: boolean;
      aspectRatio?: '9:16' | '16:9' | '1:1';
      quality?: '720p' | '1080p';
      subtitleStyle?: SubtitleStyleOptions;
    } = {},
  ): Promise<string> {
    const fs = await import('node:fs/promises');
    const { join } = await import('node:path');

    const clipPaths: string[] = [];
    let canBurnSubtitles = Boolean(options.includeSubtitles);

    for (let i = 0; i < clips.length; i++) {
      const clip = clips[i];
      if (!clip) {
        continue;
      }

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
      const aspectRatioFilter = getAspectRatioFilter(
        options.aspectRatio,
        quality,
        clip.faceTracking ?? false,
      );

      if (useFaceTracking) {
        trackAudioPath = join(outputDir, `temp_track_source_${i}_${clipId}.mp4`);
        trackVideoPath = join(outputDir, `temp_track_video_${i}_${clipId}.mp4`);
        tempPaths.push(trackAudioPath, trackVideoPath);

        try {
          await this.createFaceTrackingSourceClip(clip, trackAudioPath);
          const trackingResult = await faceTrackRunner.trackPortraitClip({
            inputPath: trackAudioPath,
            outputPath: trackVideoPath,
            targetWidth: profile.width,
            targetHeight: profile.heightPortrait,
            focusProfile: clip.focusProfile ?? 'auto',
          });

          if (!trackingResult.success) {
            throw new Error(trackingResult.error || 'Face tracking gagal dijalankan');
          }

          logger.info(
            {
              clipIndex: i,
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
        } catch (error) {
          logger.warn(
            {
              clipIndex: i,
              error: error instanceof Error ? error.message : String(error),
            },
            'Face tracking failed, falling back to static portrait crop',
          );
          trackVideoPath = '';
          trackAudioPath = '';
          baseVideoFilters.push(aspectRatioFilter);
        }
      } else {
        baseVideoFilters.push(aspectRatioFilter);
      }

      let subtitleFilter: string | null = null;
      if (canBurnSubtitles && transcriptSegments?.length) {
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
        let shouldIncludeSubtitles = Boolean(subtitleFilter);
        let shouldUseStabilize = Boolean(clip.stabilize);

        while (true) {
          const vfFilters = [...baseVideoFilters];
          if (shouldUseStabilize) {
            vfFilters.push(STABILIZE_FILTER);
          }
          if (shouldIncludeSubtitles && subtitleFilter) {
            vfFilters.push(subtitleFilter);
          }

          const args =
            trackVideoPath && trackAudioPath
              ? buildTrackedClipProcessingArgs(
                  trackVideoPath,
                  trackAudioPath,
                  clipOutPath,
                  vfFilters,
                  quality,
                  options.normalizeAudio ?? true,
                )
              : buildClipProcessingArgs(
                  clip,
                  clipOutPath,
                  vfFilters,
                  quality,
                  options.normalizeAudio ?? true,
                );

          logger.info({ clipIndex: i, args: args.join(' ') }, 'Processing export clip');

          try {
            await this.runFfmpeg(args, `Clip ${i + 1} gagal diproses`);
            break;
          } catch (error) {
            if (
              hasTranscript &&
              shouldIncludeSubtitles &&
              canBurnSubtitles &&
              isMissingSubtitlesFilterError(error)
            ) {
              logger.warn(
                { clipIndex: i, clipOutPath },
                'FFmpeg subtitles filter unavailable, retrying export clip without burned subtitles',
              );
              shouldIncludeSubtitles = false;
              canBurnSubtitles = false;
              continue;
            }

            if (shouldUseStabilize && isMissingDeshakeFilterError(error)) {
              logger.warn(
                { clipIndex: i, clipOutPath },
                'FFmpeg deshake filter unavailable, retrying export clip without stabilization',
              );
              shouldUseStabilize = false;
              continue;
            }

            throw error;
          }
        }
      } finally {
        for (const tempPath of tempPaths) {
          if (tempPath && existsSync(tempPath)) {
            await fs.unlink(tempPath).catch(() => {});
          }
        }
      }

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
