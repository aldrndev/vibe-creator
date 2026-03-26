import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { logger } from '@/lib/logger';
import { getFFmpegPath } from '@/modules/export/ffmpeg/ffmpeg-binary';
import { getVideoDuration, getVideoResolution } from '@/utils/video-info';
import {
  ensureReactionsDir,
  getOverlayPosition,
  type OverlayPosition,
  REACTIONS_DIR,
  RESOLUTIONS,
} from '../reaction.utils';

export interface CreateReactionInput {
  mainVideoPath: string;
  reactionVideoPath: string;
  position: OverlayPosition;
  customPosition?: { x: number; y: number };
  scale: number;
  margin: number;
  aspectRatio?: string;
  reactionVolume?: number;
  mainVolume?: number;
  circular?: boolean;
}

export async function processReaction(input: CreateReactionInput): Promise<string> {
  await ensureReactionsDir();

  const {
    mainVideoPath,
    reactionVideoPath,
    position,
    scale,
    margin,
    reactionVolume = 0.8,
    mainVolume = 1.0,
    circular,
    aspectRatio = '16:9',
  } = input;

  // Validate Duration (Max 5 mins)
  const [d1, d2] = await Promise.all([
    getVideoDuration(mainVideoPath),
    getVideoDuration(reactionVideoPath),
  ]);
  if (d1 > 300 * 1000 || d2 > 300 * 1000) throw new Error('Video duration exceeds 5 minutes limit');

  const outputId = randomUUID();
  const outputPath = join(REACTIONS_DIR, `${outputId}.mp4`);
  const ffmpegPath = getFFmpegPath();
  const targetResolution = RESOLUTIONS[aspectRatio] ?? RESOLUTIONS['16:9'];
  if (!targetResolution) {
    throw new Error('Default reaction resolution is not configured');
  }

  const { w: targetW, h: targetH } = targetResolution;
  const overlayPos = getOverlayPosition(position, margin, input.customPosition);

  // Smart Scaling Logic
  const { width: pipSrcW, height: pipSrcH } = await getVideoResolution(reactionVideoPath);
  const pipSrcAspect = pipSrcW / pipSrcH;
  const targetAspect = targetW / targetH;

  let pipW = Math.round(targetW * scale);

  // If PiP is Vertical and Target is Landscape
  if (pipSrcAspect < 1 && targetAspect > 1) {
    const calculatedH = pipW / pipSrcAspect;
    if (calculatedH > targetH * 0.6) {
      pipW = Math.round(targetH * 0.6 * pipSrcAspect);
    }
  }

  // Step 1: Smart Blur Main Video [main]
  const mainFilter = [
    '[0:v]split[bg][fg]',
    `[bg]scale=${targetW}:${targetH}:force_original_aspect_ratio=increase,crop=${targetW}:${targetH},boxblur=20:10[bg_blurred]`,
    `[fg]scale=${targetW}:${targetH}:force_original_aspect_ratio=decrease[fg_scaled]`,
    '[bg_blurred][fg_scaled]overlay=(W-w)/2:(H-h)/2[main]',
  ].join(';');

  // Step 2: Prepare PiP [pip]
  let pipFilter = '';

  if (circular) {
    pipFilter = `[1:v]crop='min(iw,ih):min(iw,ih):(iw-ow)/2:(ih-oh)/2',scale=${pipW}:${pipW}[pip_square];[pip_square]format=rgba,geq='r=r(X,Y):a=if(lte(hypot(X-W/2,Y-H/2),W/2),255,0)'[pip]`;
  } else {
    pipFilter = `[1:v]scale=${pipW}:-1[pip]`;
  }

  // Step 3: Overlay & Audio Mix
  const overlayFilter = `[main][pip]overlay=${overlayPos}[v]`;
  const audioFilter = `[0:a]volume=${mainVolume}[a0];[1:a]volume=${reactionVolume}[a1];[a0][a1]amix=inputs=2:duration=shortest[a]`;

  const filterComplex = `${mainFilter};${pipFilter};${overlayFilter};${audioFilter}`;

  return new Promise((resolve, reject) => {
    const args = [
      '-i',
      mainVideoPath,
      '-i',
      reactionVideoPath,
      '-filter_complex',
      filterComplex,
      '-map',
      '[v]',
      '-map',
      '[a]',
      '-c:v',
      'libx264',
      '-preset',
      'ultrafast',
      '-crf',
      '23',
      '-c:a',
      'aac',
      '-b:a',
      '128k',
      '-y',
      outputPath,
    ];

    const process = spawn(ffmpegPath, args);
    let errorOutput = '';

    process.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    process.on('close', (code) => {
      if (code === 0) {
        logger.info({ outputPath }, 'Reaction video created');
        resolve(outputPath);
      } else {
        logger.error({ code, errorOutput }, 'Reaction creation failed');
        reject(new Error(`FFmpeg failed with code ${code}`));
      }
    });

    process.on('error', (err) => {
      reject(new Error(`FFmpeg not found: ${err.message}`));
    });
  });
}
