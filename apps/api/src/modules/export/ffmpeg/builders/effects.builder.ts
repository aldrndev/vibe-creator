/**
 * Video Effects FFmpeg Command Builders
 * Complex video transformations and effects
 */

import { validateInputPath, validateOutputPath } from '../ffmpeg-path-guard';
import type { FFmpegCommand } from './basic.builder';

const STANDARD_FLAGS = ['-nostdin', '-hide_banner', '-loglevel', 'error', '-progress', 'pipe:1'];
const DEFAULT_TRANSITION_MS = 500;
const MIN_TRANSITION_SEC = 0.1;
const SLIDE_CANVAS_MULTIPLIER = 2;
const MOTION_ZOOM_DELTA = 0.04;
const TRANSITION_ZOOM_START = 0.92;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

const FILTER_MAP: Record<string, string> = {
  grayscale: 'colorchannelmixer=.3:.4:.3:0:.3:.4:.3:0:.3:.4:.3',
  sepia: 'colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131',
  vintage: 'curves=vintage',
  cold: 'colorbalance=bs=0.3',
  warm: 'colorbalance=rs=0.3:gs=0.1',
  'high-contrast': 'eq=contrast=1.4',
  fade: 'eq=contrast=0.9:brightness=0.1:saturation=0.8',
  vivid: 'eq=saturation=1.5:contrast=1.1',
};

export interface VideoEffectsOptions {
  transforms?: {
    x: number;
    y: number;
    scale: number;
    rotation: number;
    opacity: number;
  };
  effects?: {
    filters: string[];
    speed: number;
    volume: number;
    fadeIn: number;
    fadeOut: number;
    transitionIn?: 'none' | 'fade' | 'slide-left' | 'slide-right' | 'zoom';
    transitionOut?: 'none' | 'fade' | 'slide-left' | 'slide-right' | 'zoom';
    motion?: 'none' | 'zoom-in' | 'zoom-out';
  };
  outputWidth: number;
  outputHeight: number;
  durationMs: number;
  background?: {
    mode: 'solid' | 'blur';
    color?: string;
    blurAmount?: number;
    blurZoom?: number;
    dim?: number;
    saturation?: number;
  };
}

function normalizePadColor(color: string | undefined): string {
  const match = color?.match(/^#([0-9a-fA-F]{6})(?:[0-9a-fA-F]{2})?$/);
  return match ? `0x${match[1]}` : 'black';
}

function buildBlurFillFilter(
  outputWidth: number,
  outputHeight: number,
  options: {
    blurAmount?: number;
    blurZoom?: number;
    dim?: number;
    saturation?: number;
  } = {},
): string {
  const blurAmount = clamp(options.blurAmount ?? 18, 0, 50);
  const blurZoom = clamp(options.blurZoom ?? 1.08, 1, 1.5);
  const dim = clamp(options.dim ?? 0.08, 0, 0.6);
  const saturation = clamp(options.saturation ?? 1.05, 0, 2);
  const scaledWidth = Math.ceil(outputWidth * blurZoom);
  const scaledHeight = Math.ceil(outputHeight * blurZoom);

  return [
    'split=2[bgsrc][fgsrc]',
    `[bgsrc]scale=${scaledWidth}:${scaledHeight}:force_original_aspect_ratio=increase,crop=${outputWidth}:${outputHeight},gblur=sigma=${blurAmount},eq=brightness=${-dim}:saturation=${saturation}[bg]`,
    `[fgsrc]scale=${outputWidth}:${outputHeight}:force_original_aspect_ratio=decrease[fg]`,
    '[bg][fg]overlay=(W-w)/2:(H-h)/2,format=yuv420p',
  ].join(';');
}

function ffmpegMin(left: string | number, right: string | number): string {
  return `min(${left}\\,${right})`;
}

function ffmpegMax(left: string | number, right: string | number): string {
  return `max(${left}\\,${right})`;
}

function buildProgressExpression(startSec: number, durationSec: number): string {
  const safeDurationSec = Math.max(MIN_TRANSITION_SEC, durationSec);
  const elapsed = `(t-${startSec.toFixed(3)})/${safeDurationSec.toFixed(3)}`;
  return ffmpegMin(1, ffmpegMax(0, elapsed));
}

function buildScaleToCanvasFilter(
  outputWidth: number,
  outputHeight: number,
  scaleExpression: string,
): string {
  return [
    `scale=w='trunc(iw*${scaleExpression}/2)*2':h='trunc(ih*${scaleExpression}/2)*2':eval=frame`,
    `pad=w='${ffmpegMax('iw', outputWidth)}':h='${ffmpegMax(
      'ih',
      outputHeight,
    )}':x=(ow-iw)/2:y=(oh-ih)/2:color=black`,
    `crop=${outputWidth}:${outputHeight}`,
  ].join(',');
}

function buildSlideTransitionFilter(
  direction: 'slide-left' | 'slide-right',
  phase: 'in' | 'out',
  progressExpression: string,
  outputWidth: number,
  outputHeight: number,
): string {
  const paddedWidth = outputWidth * SLIDE_CANVAS_MULTIPLIER;
  const contentX = direction === 'slide-left' ? 0 : outputWidth;
  let cropX: string;
  if (phase === 'in') {
    if (direction === 'slide-left') {
      cropX = `${outputWidth}*(1-${progressExpression})`;
    } else {
      cropX = `${outputWidth}*${progressExpression}`;
    }
  } else {
    if (direction === 'slide-left') {
      cropX = `${outputWidth}*${progressExpression}`;
    } else {
      cropX = `${outputWidth}*(1-${progressExpression})`;
    }
  }

  return [
    `pad=${paddedWidth}:${outputHeight}:${contentX}:0:color=black`,
    `crop=${outputWidth}:${outputHeight}:x='${cropX}':y=0`,
  ].join(',');
}

function buildMotionFilters(
  motion: 'none' | 'zoom-in' | 'zoom-out' | undefined,
  durationSec: number,
  outputWidth: number,
  outputHeight: number,
): string[] {
  if (!motion || motion === 'none') return [];
  const progress = ffmpegMin(1, ffmpegMax(0, `t/${durationSec.toFixed(3)}`));
  const start = motion === 'zoom-in' ? 1 : 1 + MOTION_ZOOM_DELTA;
  const direction = motion === 'zoom-in' ? 1 : -1;
  const scaleExpression = `(${start}+(${direction * MOTION_ZOOM_DELTA})*${progress})`;
  return [buildScaleToCanvasFilter(outputWidth, outputHeight, scaleExpression)];
}

function buildTransitionInFilters(
  transitionIn: 'none' | 'fade' | 'slide-left' | 'slide-right' | 'zoom' | undefined,
  fadeIn: number | undefined,
  outputWidth: number,
  outputHeight: number,
): string[] {
  if (!transitionIn || transitionIn === 'none') return [];
  const filters: string[] = [];
  const transitionSec = Math.max(MIN_TRANSITION_SEC, (fadeIn || DEFAULT_TRANSITION_MS) / 1000);

  if (transitionIn === 'slide-left' || transitionIn === 'slide-right') {
    filters.push(
      buildSlideTransitionFilter(
        transitionIn,
        'in',
        buildProgressExpression(0, transitionSec),
        outputWidth,
        outputHeight,
      ),
    );
  } else if (transitionIn === 'zoom') {
    const progress = buildProgressExpression(0, transitionSec);
    const scaleExpression = `(${TRANSITION_ZOOM_START}+(1-${TRANSITION_ZOOM_START})*${progress})`;
    filters.push(buildScaleToCanvasFilter(outputWidth, outputHeight, scaleExpression));
  }
  return filters;
}

function buildTransitionOutFilters(
  transitionOut: 'none' | 'fade' | 'slide-left' | 'slide-right' | 'zoom' | undefined,
  fadeOut: number | undefined,
  durationSec: number,
  outputWidth: number,
  outputHeight: number,
): string[] {
  if (!transitionOut || transitionOut === 'none') return [];
  const filters: string[] = [];
  const transitionSec = Math.max(MIN_TRANSITION_SEC, (fadeOut || DEFAULT_TRANSITION_MS) / 1000);
  const transitionStartSec = Math.max(0, durationSec - transitionSec);

  if (transitionOut === 'slide-left' || transitionOut === 'slide-right') {
    filters.push(
      buildSlideTransitionFilter(
        transitionOut,
        'out',
        buildProgressExpression(transitionStartSec, transitionSec),
        outputWidth,
        outputHeight,
      ),
    );
  } else if (transitionOut === 'zoom') {
    const progress = buildProgressExpression(transitionStartSec, transitionSec);
    const scaleExpression = `(1-(1-${TRANSITION_ZOOM_START})*${progress})`;
    filters.push(buildScaleToCanvasFilter(outputWidth, outputHeight, scaleExpression));
  }
  return filters;
}

function buildVisualTransitionFilters(
  effects: VideoEffectsOptions['effects'] | undefined,
  outputWidth: number,
  outputHeight: number,
  durationMs: number,
): string[] {
  if (!effects) return [];

  const filters: string[] = [];
  const durationSec = Math.max(MIN_TRANSITION_SEC, durationMs / 1000);

  filters.push(...buildMotionFilters(effects.motion, durationSec, outputWidth, outputHeight));
  filters.push(
    ...buildTransitionInFilters(effects.transitionIn, effects.fadeIn, outputWidth, outputHeight),
  );
  filters.push(
    ...buildTransitionOutFilters(
      effects.transitionOut,
      effects.fadeOut,
      durationSec,
      outputWidth,
      outputHeight,
    ),
  );

  return filters;
}

function buildSpeedFilters(speed: number | undefined) {
  const videoFilters: string[] = [];
  const audioFilters: string[] = [];
  if (speed !== undefined && speed !== 1) {
    const clampedSpeed = clamp(speed, 0.25, 4);
    videoFilters.push(`setpts=${(1 / clampedSpeed).toFixed(4)}*PTS`);

    if (clampedSpeed >= 0.5 && clampedSpeed <= 2) {
      audioFilters.push(`atempo=${clampedSpeed}`);
    } else if (clampedSpeed < 0.5) {
      audioFilters.push('atempo=0.5', `atempo=${clampedSpeed * 2}`);
    } else {
      audioFilters.push('atempo=2.0', `atempo=${clampedSpeed / 2}`);
    }
  }
  return { videoFilters, audioFilters };
}

function buildTransformFilters(
  transforms: VideoEffectsOptions['transforms'] | undefined,
  background: VideoEffectsOptions['background'] | undefined,
  outputWidth: number,
  outputHeight: number,
) {
  const filters: string[] = [];
  const scale = transforms?.scale ?? 1;
  const rotation = transforms?.rotation ?? 0;
  const tx = transforms?.x ?? 0;
  const ty = transforms?.y ?? 0;

  if (scale !== 1 || rotation !== 0 || tx !== 0 || ty !== 0) {
    if (scale !== 1) {
      const clampedScale = clamp(scale, 0.1, 3);
      filters.push(`scale=iw*${clampedScale}:ih*${clampedScale}`);
    }

    if (rotation !== 0) {
      const radians = ((rotation * Math.PI) / 180).toFixed(4);
      filters.push(`rotate=${radians}:c=none:ow=rotw(${radians}):oh=roth(${radians})`);
    }

    filters.push(
      `pad=${outputWidth}:${outputHeight}:(ow-iw)/2+${Math.round(
        tx,
      )}:(oh-ih)/2+${Math.round(ty)}:color=black@0`,
    );
  } else {
    if (background?.mode === 'blur') {
      filters.push(
        buildBlurFillFilter(outputWidth, outputHeight, {
          blurAmount: background.blurAmount,
          blurZoom: background.blurZoom,
          dim: background.dim,
          saturation: background.saturation,
        }),
      );
    } else {
      filters.push(
        `scale=${outputWidth}:${outputHeight}:force_original_aspect_ratio=decrease`,
        `pad=${outputWidth}:${outputHeight}:(ow-iw)/2:(oh-ih)/2:color=${normalizePadColor(
          background?.color,
        )}`,
      );
    }
  }
  return filters;
}

function buildOpacityFilters(opacity: number | undefined) {
  if (opacity !== undefined && opacity < 1) {
    const clampedOpacity = clamp(opacity, 0, 1);
    return [`format=rgba,colorchannelmixer=aa=${clampedOpacity}`];
  }
  return [];
}

/**
 * Build video effects command with transforms, filters, speed, and audio effects
 */
export function buildVideoEffectsCommand(
  input: string,
  output: string,
  options: VideoEffectsOptions,
): FFmpegCommand {
  const validInput = validateInputPath(input);
  const validOutput = validateOutputPath(output);

  const { transforms, effects, outputWidth, outputHeight, durationMs, background } = options;

  const videoFilters: string[] = [];
  const audioFilters: string[] = [];

  // 1. Speed adjustment
  const speedOut = buildSpeedFilters(effects?.speed);
  videoFilters.push(...speedOut.videoFilters);
  audioFilters.push(...speedOut.audioFilters);

  // 2. Transform: scale + rotation + position
  videoFilters.push(...buildTransformFilters(transforms, background, outputWidth, outputHeight));

  // 3. Apply color filter
  const filterId = effects?.filters?.[0];
  if (filterId && FILTER_MAP[filterId]) {
    videoFilters.push(FILTER_MAP[filterId]);
  }

  // 4. Opacity
  videoFilters.push(...buildOpacityFilters(transforms?.opacity));

  // 5. Visual transitions and motion
  videoFilters.push(
    ...buildVisualTransitionFilters(effects, outputWidth, outputHeight, durationMs),
  );

  // 6. Video fade in/out
  const fadeIn = effects?.fadeIn ?? 0;
  const fadeOut = effects?.fadeOut ?? 0;
  const durationSec = durationMs / 1000;

  if (fadeIn > 0) {
    videoFilters.push(`fade=t=in:st=0:d=${fadeIn / 1000}`);
    audioFilters.push(`afade=t=in:st=0:d=${fadeIn / 1000}`);
  }
  if (fadeOut > 0) {
    const fadeOutStart = Math.max(0, durationSec - fadeOut / 1000);
    videoFilters.push(`fade=t=out:st=${fadeOutStart.toFixed(3)}:d=${fadeOut / 1000}`);
    audioFilters.push(`afade=t=out:st=${fadeOutStart.toFixed(3)}:d=${fadeOut / 1000}`);
  }

  // 7. Volume
  const volume = effects?.volume ?? 1;
  if (volume !== 1) {
    const clampedVolume = clamp(volume, 0, 2);
    audioFilters.push(`volume=${clampedVolume}`);
  }

  // Build args
  const args = [...STANDARD_FLAGS, '-i', validInput];

  if (videoFilters.length > 0) {
    args.push('-vf', videoFilters.join(','));
  }

  if (audioFilters.length > 0) {
    args.push('-af', audioFilters.join(','));
  }

  args.push(
    '-c:v',
    'libx264',
    '-preset',
    'medium',
    '-crf',
    '23',
    '-pix_fmt',
    'yuv420p',
    '-c:a',
    'aac',
    '-b:a',
    '192k',
    '-movflags',
    '+faststart',
    validOutput,
  );

  return {
    args,
    expectedOutputs: [validOutput],
    inputs: [validInput],
  };
}
