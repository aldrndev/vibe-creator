/**
 * FFmpeg Processor (CLI-based)
 * Re-implements ffmpegProcessor using direct FFmpeg CLI execution
 */

import { logger } from '@/lib/logger';
import {
  buildTrimCommand,
  buildVideoEffectsCommand,
  runFFmpeg,
  validateInputPath,
  validateOutputPath,
} from './ffmpeg/index';

interface TrimOptions {
  inputPath: string;
  outputPath: string;
  startTime: number; // seconds
  endTime: number; // seconds
  totalDuration?: number; // seconds, for progress
  signal?: AbortSignal;
  onProgress?: (percent: number) => void;
}

interface ConcatOptions {
  inputPaths: string[];
  outputPath: string;
  signal?: AbortSignal;
  onProgress?: (percent: number) => void;
}

interface WatermarkOptions {
  inputPath: string;
  outputPath: string;
  watermarkText?: string;
  signal?: AbortSignal;
}

interface ApplyEffectsOptions {
  inputPath: string;
  outputPath: string;
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
  signal?: AbortSignal;
  onProgress?: (percent: number) => void;
}

// Phase timeout constants
const PHASE_TIMEOUTS = {
  TRIM: 60_000, // 1 min
  CONCAT: 300_000, // 5 min
  WATERMARK: 120_000, // 2 min
  EFFECTS: 180_000, // 3 min (processing effects can be slow)
};

/**
 * FFmpeg processor using direct CLI execution
 */
export const ffmpegProcessorCLI = {
  /**
   * Trim a video clip
   */
  async trim(options: TrimOptions): Promise<void> {
    const { inputPath, outputPath, startTime, endTime, totalDuration, signal, onProgress } =
      options;

    // Calculate duration in ms
    const durationMs = (endTime - startTime) * 1000;
    const totalDurationMs = (totalDuration || endTime - startTime) * 1000;

    // Validate paths
    const validInput = validateInputPath(inputPath);
    const validOutput = validateOutputPath(outputPath);

    // Build command
    const command = buildTrimCommand(
      validInput,
      validOutput,
      startTime * 1000, // convert to ms
      endTime * 1000,
      durationMs,
    );

    logger.info({ inputPath: validInput, startTime, endTime }, 'Trimming video');

    await runFFmpeg({
      args: command.args,
      tempDir: '', // Not used internally, cleanup managed by caller
      totalDurationMs,
      timeoutMs: PHASE_TIMEOUTS.TRIM,
      signal,
      onProgress: (update) => {
        if (update.type === 'PROGRESS' && update.percent !== undefined) {
          onProgress?.(update.percent);
        }
      },
    });

    logger.info({ outputPath: validOutput }, 'Trim completed');
  },

  /**
   * Concatenate multiple video clips
   * Uses filter_complex with concat filter
   */
  async concat(options: ConcatOptions): Promise<void> {
    const { inputPaths, outputPath, signal, onProgress } = options;

    if (inputPaths.length === 0) {
      throw new Error('No input files for concatenation');
    }

    // If only one input, just copy it
    if (inputPaths.length === 1 && inputPaths[0]) {
      const input = validateInputPath(inputPaths[0]);
      const output = validateOutputPath(outputPath);

      // Simple copy using FFmpeg
      const args = [
        '-nostdin',
        '-hide_banner',
        '-loglevel',
        'error',
        '-progress',
        'pipe:1',
        '-i',
        input,
        '-c',
        'copy',
        output,
      ];

      await runFFmpeg({
        args,
        tempDir: '',
        totalDurationMs: 60_000, // Estimate
        timeoutMs: PHASE_TIMEOUTS.CONCAT,
        signal,
        onProgress: (update) => {
          if (update.type === 'PROGRESS' && update.percent !== undefined) {
            onProgress?.(update.percent);
          }
        },
      });

      return;
    }

    // Multiple inputs - use concat filter
    const validInputs = inputPaths.map((p) => validateInputPath(p));
    const validOutput = validateOutputPath(outputPath);

    // Build concat filter
    const inputArgs: string[] = [];
    validInputs.forEach((path) => {
      inputArgs.push('-i', path);
    });

    const filterInputs = validInputs.map((_, i) => `[${i}:v:0][${i}:a:0]`).join('');
    const filterComplex = `${filterInputs}concat=n=${validInputs.length}:v=1:a=1[outv][outa]`;

    const args = [
      '-nostdin',
      '-hide_banner',
      '-loglevel',
      'error',
      '-progress',
      'pipe:1',
      ...inputArgs,
      '-filter_complex',
      filterComplex,
      '-map',
      '[outv]',
      '-map',
      '[outa]',
      '-c:v',
      'libx264',
      '-c:a',
      'aac',
      '-preset',
      'fast',
      '-movflags',
      '+faststart',
      validOutput,
    ];

    logger.info({ inputCount: validInputs.length }, 'Concatenating videos');

    await runFFmpeg({
      args,
      tempDir: '',
      totalDurationMs: 300_000, // Estimate for concat
      timeoutMs: PHASE_TIMEOUTS.CONCAT,
      signal,
      onProgress: (update) => {
        if (update.type === 'PROGRESS' && update.percent !== undefined) {
          onProgress?.(update.percent);
        }
      },
    });

    logger.info({ outputPath: validOutput }, 'Concat completed');
  },

  /**
   * Add watermark to video
   */
  async addWatermark(options: WatermarkOptions): Promise<void> {
    const { inputPath, outputPath, watermarkText, signal } = options;

    const validInput = validateInputPath(inputPath);
    const validOutput = validateOutputPath(outputPath);

    const text = watermarkText || 'Made with VibeCreator';
    // Escape special characters for FFmpeg drawtext
    const escapedText = text.replace(/[:\\]/g, '\\$&').replace(/'/g, "\\'");

    const args = [
      '-nostdin',
      '-hide_banner',
      '-loglevel',
      'error',
      '-progress',
      'pipe:1',
      '-i',
      validInput,
      '-vf',
      `drawtext=text='${escapedText}':fontsize=24:fontcolor=white@0.5:x=w-tw-20:y=h-th-20`,
      '-c:v',
      'libx264',
      '-c:a',
      'copy',
      '-preset',
      'fast',
      validOutput,
    ];

    logger.info({ inputPath: validInput, text }, 'Adding watermark');

    await runFFmpeg({
      args,
      tempDir: '',
      totalDurationMs: 120_000, // Estimate
      timeoutMs: PHASE_TIMEOUTS.WATERMARK,
      signal,
    });

    logger.info({ outputPath: validOutput }, 'Watermark added');
  },

  /**
   * Apply video effects including transforms, filters, speed, volume, fades
   */
  async applyEffects(options: ApplyEffectsOptions): Promise<void> {
    const {
      inputPath,
      outputPath,
      transforms,
      effects,
      outputWidth,
      outputHeight,
      durationMs,
      signal,
      onProgress,
    } = options;

    const validInput = validateInputPath(inputPath);
    const validOutput = validateOutputPath(outputPath);

    // Build command with transforms and effects
    const command = buildVideoEffectsCommand(validInput, validOutput, {
      transforms,
      effects,
      outputWidth,
      outputHeight,
      durationMs,
    });

    logger.info({ inputPath: validInput, transforms, effects }, 'Applying video effects');

    await runFFmpeg({
      args: command.args,
      tempDir: '',
      totalDurationMs: durationMs,
      timeoutMs: PHASE_TIMEOUTS.EFFECTS,
      signal,
      onProgress: (update) => {
        if (update.type === 'PROGRESS' && update.percent !== undefined) {
          onProgress?.(update.percent);
        }
      },
    });

    logger.info({ outputPath: validOutput }, 'Effects applied');
  },
};

// Re-export for backwards compatibility
export { ffmpegProcessorCLI as ffmpegProcessor };
