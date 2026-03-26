/**
 * Audio FFmpeg Command Builders
 * Audio mixing and processing operations
 */

import { validateInputPath, validateOutputPath } from '../ffmpeg-path-guard';
import type { FFmpegCommand } from './basic.builder';

const STANDARD_FLAGS = ['-nostdin', '-hide_banner', '-loglevel', 'error', '-progress', 'pipe:1'];

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Build audio mix command
 */
export function buildAudioMixCommand(
  inputs: Array<{ path: string; volume: number }>,
  output: string,
): FFmpegCommand {
  const validInputs = inputs.map(({ path }) => validateInputPath(path));
  const validOutput = validateOutputPath(output);

  const inputArgs: string[] = [];
  inputs.forEach(({ path }) => {
    inputArgs.push('-i', validateInputPath(path));
  });

  const filterParts: string[] = [];
  inputs.forEach(({ volume }, i) => {
    const clampedVolume = clamp(volume, 0, 2);
    filterParts.push(`[${i}:a]volume=${clampedVolume}[a${i}]`);
  });

  const mixInputs = inputs.map((_, i) => `[a${i}]`).join('');
  const filterComplex = `${filterParts.join(';')};${mixInputs}amix=inputs=${
    inputs.length
  }:duration=longest[out]`;

  const args = [
    ...STANDARD_FLAGS,
    ...inputArgs,
    '-filter_complex',
    filterComplex,
    '-map',
    '[out]',
    '-c:a',
    'aac',
    '-b:a',
    '192k',
    validOutput,
  ];

  return {
    args,
    expectedOutputs: [validOutput],
    inputs: validInputs,
  };
}
