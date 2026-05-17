/**
 * Basic FFmpeg Command Builders
 * Simple operations: trim, encode, mux
 */

import { validateInputPath, validateOutputPath } from '../ffmpeg-path-guard';

export interface FFmpegCommand {
  args: string[];
  expectedOutputs: string[];
  inputs: string[];
}

export type Resolution = '720p' | '1080p' | '2160p';
export type ExportPreset = 'fast' | 'balanced' | 'quality';

const RESOLUTION_MAP: Record<Resolution, { width: number; height: number }> = {
  '720p': { width: 1280, height: 720 },
  '1080p': { width: 1920, height: 1080 },
  '2160p': { width: 3840, height: 2160 },
};

const PRESET_MAP: Record<ExportPreset, string> = {
  fast: 'veryfast',
  balanced: 'medium',
  quality: 'slow',
};

const STANDARD_FLAGS = ['-nostdin', '-hide_banner', '-loglevel', 'error', '-progress', 'pipe:1'];

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Build trim command
 */
export function buildTrimCommand(
  input: string,
  output: string,
  startMs: number,
  endMs: number,
  durationMs: number,
): FFmpegCommand {
  const validInput = validateInputPath(input);
  const validOutput = validateOutputPath(output);

  const startSec = clamp(startMs / 1000, 0, Number.MAX_SAFE_INTEGER);
  const requestedDurationSec = (endMs - startMs) / 1000;
  const fallbackDurationSec = Math.max(0.1, durationMs / 1000);
  const duration = requestedDurationSec > 0 ? requestedDurationSec : fallbackDurationSec;

  const args = [
    ...STANDARD_FLAGS,
    '-ss',
    startSec.toFixed(3),
    '-i',
    validInput,
    '-t',
    duration.toFixed(3),
    '-c',
    'copy',
    validOutput,
  ];

  return {
    args,
    expectedOutputs: [validOutput],
    inputs: [validInput],
  };
}

/**
 * Build encode command
 */
export function buildEncodeCommand(
  input: string,
  output: string,
  preset: ExportPreset,
  resolution: Resolution,
): FFmpegCommand {
  const validInput = validateInputPath(input);
  const validOutput = validateOutputPath(output);

  const { width, height } = RESOLUTION_MAP[resolution];
  const ffmpegPreset = PRESET_MAP[preset];

  const args = [
    ...STANDARD_FLAGS,
    '-i',
    validInput,
    '-vf',
    `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2`,
    '-c:v',
    'libx264',
    '-preset',
    ffmpegPreset,
    '-crf',
    '23',
    '-pix_fmt',
    'yuv420p',
    '-movflags',
    '+faststart',
    '-an',
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
  output: string,
): FFmpegCommand {
  const validVideoInput = validateInputPath(videoInput);
  const validAudioInput = validateInputPath(audioInput);
  const validOutput = validateOutputPath(output);

  const args = [
    ...STANDARD_FLAGS,
    '-i',
    validVideoInput,
    '-i',
    validAudioInput,
    '-c',
    'copy',
    '-map',
    '0:v:0',
    '-map',
    '1:a:0',
    validOutput,
  ];

  return {
    args,
    expectedOutputs: [validOutput],
    inputs: [validVideoInput, validAudioInput],
  };
}

/**
 * Build text overlay command
 */
export function buildTextOverlayCommand(
  videoInput: string,
  output: string,
  text: string,
  x: number,
  y: number,
  fontSize: number,
  fontColor: string,
  fontFile?: string,
): FFmpegCommand {
  const validInput = validateInputPath(videoInput);
  const validOutput = validateOutputPath(output);

  const escapedText = text.replace(/[:\\]/g, '\\$&').replace(/'/g, "\\'");

  let drawtextFilter = `drawtext=text='${escapedText}':x=${x}:y=${y}:fontsize=${fontSize}:fontcolor=${fontColor}`;

  if (fontFile) {
    const validFontFile = validateInputPath(fontFile);
    drawtextFilter += `:fontfile=${validFontFile}`;
  }

  const args = [
    ...STANDARD_FLAGS,
    '-i',
    validInput,
    '-vf',
    drawtextFilter,
    '-c:a',
    'copy',
    validOutput,
  ];

  return {
    args,
    expectedOutputs: [validOutput],
    inputs: [validInput],
  };
}
