/**
 * FFmpeg Command Builder
 * Deterministic FFmpeg args array generation with type safety
 */

import { validateInputPath, validateOutputPath } from './ffmpeg-path-guard';

export interface FFmpegCommand {
  args: string[];
  expectedOutputs: string[];
  inputs: string[];
}

/**
 * Resolution presets
 */
export type Resolution = '720p' | '1080p' | '2160p';

const RESOLUTION_MAP: Record<Resolution, { width: number; height: number }> = {
  '720p': { width: 1280, height: 720 },
  '1080p': { width: 1920, height: 1080 },
  '2160p': { width: 3840, height: 2160 },
};

/**
 * Export preset
 */
export type ExportPreset = 'fast' | 'balanced' | 'quality';

const PRESET_MAP: Record<ExportPreset, string> = {
  fast: 'veryfast',
  balanced: 'medium',
  quality: 'slow',
};

/**
 * Clamp value between min and max
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Standard FFmpeg flags for all commands
 */
const STANDARD_FLAGS = [
  '-nostdin',           // No interaction
  '-hide_banner',       // Clean logs
  '-loglevel', 'error', // Only errors
  '-progress', 'pipe:1', // Progress to stdout
];

/**
 * Build trim command
 */
export function buildTrimCommand(
  input: string,
  output: string,
  startMs: number,
  endMs: number,
  durationMs: number
): FFmpegCommand {
  // Validate paths
  const validInput = validateInputPath(input);
  const validOutput = validateOutputPath(output);
  
  // Clamp timestamps
  const startSec = clamp(startMs / 1000, 0, durationMs / 1000);
  const endSec = clamp(endMs / 1000, startSec, durationMs / 1000);
  const duration = endSec - startSec;
  
  const args = [
    ...STANDARD_FLAGS,
    '-ss', startSec.toFixed(3),
    '-i', validInput,
    '-t', duration.toFixed(3),
    '-c', 'copy', // Stream copy (fast)
    validOutput,
  ];
  
  return {
    args,
    expectedOutputs: [validOutput],
    inputs: [validInput],
  };
}

/**
 * Build audio mix command
 */
export function buildAudioMixCommand(
  inputs: Array<{ path: string; volume: number }>,
  output: string
): FFmpegCommand {
  // Validate paths
  const validInputs = inputs.map(({ path }) => validateInputPath(path));
  const validOutput = validateOutputPath(output);
  
  // Build input args
  const inputArgs: string[] = [];
  inputs.forEach(({ path }) => {
    inputArgs.push('-i', validateInputPath(path));
  });
  
  // Build filter complex for mixing
  const filterParts: string[] = [];
  inputs.forEach(({ volume }, i) => {
    const clampedVolume = clamp(volume, 0, 2);
    filterParts.push(`[${i}:a]volume=${clampedVolume}[a${i}]`);
  });
  
  const mixInputs = inputs.map((_, i) => `[a${i}]`).join('');
  const filterComplex = `${filterParts.join(';')};${mixInputs}amix=inputs=${inputs.length}:duration=longest[out]`;
  
  const args = [
    ...STANDARD_FLAGS,
    ...inputArgs,
    '-filter_complex', filterComplex,
    '-map', '[out]',
    '-c:a', 'aac',
    '-b:a', '192k',
    validOutput,
  ];
  
  return {
    args,
    expectedOutputs: [validOutput],
    inputs: validInputs,
  };
}

/**
 * Build encode command
 */
export function buildEncodeCommand(
  input: string,
  output: string,
  preset: ExportPreset,
  resolution: Resolution
): FFmpegCommand {
  // Validate paths
  const validInput = validateInputPath(input);
  const validOutput = validateOutputPath(output);
  
  const { width, height } = RESOLUTION_MAP[resolution];
  const ffmpegPreset = PRESET_MAP[preset];
  
  const args = [
    ...STANDARD_FLAGS,
    '-i', validInput,
    '-vf', `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2`,
    '-c:v', 'libx264',
    '-preset', ffmpegPreset,
    '-crf', '23',
    '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart',
    '-an', // No audio (will be muxed separately)
    validOutput,
  ];
  
  return {
    args,
    expectedOutputs: [validOutput],
    inputs: [validInput],
  };
}

/**
 * Build mux command (combine video + audio)
 */
export function buildMuxCommand(
  videoInput: string,
  audioInput: string,
  output: string
): FFmpegCommand {
  // Validate paths
  const validVideoInput = validateInputPath(videoInput);
  const validAudioInput = validateInputPath(audioInput);
  const validOutput = validateOutputPath(output);
  
  const args = [
    ...STANDARD_FLAGS,
    '-i', validVideoInput,
    '-i', validAudioInput,
    '-c', 'copy', // Stream copy (fast)
    '-map', '0:v:0', // Video from first input
    '-map', '1:a:0', // Audio from second input
    validOutput,
  ];
  
  return {
    args,
    expectedOutputs: [validOutput],
    inputs: [validVideoInput, validAudioInput],
  };
}

/**
 * Build text overlay command (using drawtext filter)
 */
export function buildTextOverlayCommand(
  videoInput: string,
  output: string,
  text: string,
  x: number,
  y: number,
  fontSize: number,
  fontColor: string,
  fontFile?: string
): FFmpegCommand {
  // Validate paths
  const validInput = validateInputPath(videoInput);
  const validOutput = validateOutputPath(output);
  
  // Escape text for FFmpeg
  const escapedText = text.replace(/[:\\]/g, '\\$&').replace(/'/g, "\\'");
  
  // Build drawtext filter
  let drawtextFilter = `drawtext=text='${escapedText}':x=${x}:y=${y}:fontsize=${fontSize}:fontcolor=${fontColor}`;
  
  if (fontFile) {
    const validFontFile = validateInputPath(fontFile);
    drawtextFilter += `:fontfile=${validFontFile}`;
  }
  
  const args = [
    ...STANDARD_FLAGS,
    '-i', validInput,
    '-vf', drawtextFilter,
    '-c:a', 'copy',
    validOutput,
  ];
  
  return {
    args,
    expectedOutputs: [validOutput],
    inputs: [validInput],
  };
}

/**
 * Video effects/transforms options
 */
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
  };
  outputWidth: number;
  outputHeight: number;
  durationMs: number;
}

/**
 * Filter ID to FFmpeg filter mapping
 */
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

/**
 * Build video effects command with transforms, filters, speed, and audio effects
 */
export function buildVideoEffectsCommand(
  input: string,
  output: string,
  options: VideoEffectsOptions
): FFmpegCommand {
  // Validate paths
  const validInput = validateInputPath(input);
  const validOutput = validateOutputPath(output);
  
  const { transforms, effects, outputWidth, outputHeight, durationMs } = options;
  
  // Build video filter chain
  const videoFilters: string[] = [];
  const audioFilters: string[] = [];
  
  // 1. Speed adjustment (setpts for video, atempo for audio)
  const speed = effects?.speed ?? 1;
  if (speed !== 1) {
    const clampedSpeed = clamp(speed, 0.25, 4);
    videoFilters.push(`setpts=${(1/clampedSpeed).toFixed(4)}*PTS`);
    // Audio tempo only supports 0.5-2.0, chain if needed
    if (clampedSpeed >= 0.5 && clampedSpeed <= 2) {
      audioFilters.push(`atempo=${clampedSpeed}`);
    } else if (clampedSpeed < 0.5) {
      audioFilters.push('atempo=0.5', `atempo=${clampedSpeed * 2}`);
    } else {
      audioFilters.push('atempo=2.0', `atempo=${clampedSpeed / 2}`);
    }
  }
  
  // 2. Transform: scale + rotation + position
  const scale = transforms?.scale ?? 1;
  const rotation = transforms?.rotation ?? 0;
  const tx = transforms?.x ?? 0;
  const ty = transforms?.y ?? 0;
  
  if (scale !== 1 || rotation !== 0 || tx !== 0 || ty !== 0) {
    // Scale the video
    if (scale !== 1) {
      const clampedScale = clamp(scale, 0.1, 3);
      videoFilters.push(`scale=iw*${clampedScale}:ih*${clampedScale}`);
    }
    
    // Rotate
    if (rotation !== 0) {
      const radians = (rotation * Math.PI / 180).toFixed(4);
      videoFilters.push(`rotate=${radians}:c=none:ow=rotw(${radians}):oh=roth(${radians})`);
    }
    
    // Pad to output size and position (translate)
    videoFilters.push(
      `pad=${outputWidth}:${outputHeight}:(ow-iw)/2+${Math.round(tx)}:(oh-ih)/2+${Math.round(ty)}:color=black@0`
    );
  } else {
    // Just scale to output size
    videoFilters.push(
      `scale=${outputWidth}:${outputHeight}:force_original_aspect_ratio=decrease`,
      `pad=${outputWidth}:${outputHeight}:(ow-iw)/2:(oh-ih)/2`
    );
  }
  
  // 3. Apply color filter
  const filterId = effects?.filters?.[0];
  if (filterId && FILTER_MAP[filterId]) {
    videoFilters.push(FILTER_MAP[filterId]);
  }
  
  // 4. Opacity
  const opacity = transforms?.opacity ?? 1;
  if (opacity < 1) {
    const clampedOpacity = clamp(opacity, 0, 1);
    videoFilters.push(`format=rgba,colorchannelmixer=aa=${clampedOpacity}`);
  }
  
  // 5. Video fade in/out
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
  
  // 6. Volume
  const volume = effects?.volume ?? 1;
  if (volume !== 1) {
    const clampedVolume = clamp(volume, 0, 2);
    audioFilters.push(`volume=${clampedVolume}`);
  }
  
  // Build args
  const args = [
    ...STANDARD_FLAGS,
    '-i', validInput,
  ];
  
  // Add video filter chain
  if (videoFilters.length > 0) {
    args.push('-vf', videoFilters.join(','));
  }
  
  // Add audio filter chain
  if (audioFilters.length > 0) {
    args.push('-af', audioFilters.join(','));
  }
  
  // Output encoding
  args.push(
    '-c:v', 'libx264',
    '-preset', 'medium',
    '-crf', '23',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-movflags', '+faststart',
    validOutput
  );
  
  return {
    args,
    expectedOutputs: [validOutput],
    inputs: [validInput],
  };
}
