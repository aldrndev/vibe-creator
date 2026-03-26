/**
 * Video Extraction Service
 * Handles extraction of audio, thumbnails, and preview clips.
 */

import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { logger } from '@/lib/logger';

const ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg';

export const videoExtractionService = {
  /**
   * Extract a lightweight audio proxy (16kHz mono WAV) for fast analysis.
   * Prevents reading the full video file multiple times.
   */
  async extractAudioProxy(inputPath: string, outputDir: string): Promise<string> {
    if (!existsSync(inputPath)) {
      throw new Error(`Input file not found: ${inputPath}`);
    }

    // Security: Ensure output path is within allowed directory
    const fileName = `proxy_${randomUUID()}.wav`;
    const outputPath = join(outputDir, fileName);

    const args = [
      '-y', // Overwrite output
      '-i',
      inputPath,
      '-vn', // No video
      '-ac',
      '1', // Mono
      '-ar',
      '16000', // 16kHz sample rate
      '-f',
      'wav',
      outputPath,
    ];

    logger.info({ inputPath, outputPath }, 'Extracting audio proxy');

    return new Promise((resolve, reject) => {
      const proc = spawn(ffmpegPath, args);

      let errorData = '';
      proc.stderr.on('data', (data) => {
        errorData += data.toString();
      });

      proc.on('close', (code) => {
        if (code === 0 && existsSync(outputPath)) {
          resolve(outputPath);
        } else {
          logger.error({ code, errorData }, 'Audio proxy extraction failed');
          reject(new Error(`FFmpeg exited with code ${code}`));
        }
      });
    });
  },

  /**
   * Extract audio proxy for a specific clip range
   */
  async extractClipAudioProxy(
    inputPath: string,
    outputDir: string,
    startMs: number,
    endMs: number,
  ): Promise<string> {
    if (!existsSync(inputPath)) {
      throw new Error(`Input file not found: ${inputPath}`);
    }

    const startSec = startMs / 1000;
    const durationSec = (endMs - startMs) / 1000;

    const fileName = `clip_proxy_${randomUUID()}.wav`;
    const outputPath = join(outputDir, fileName);

    const args = [
      '-y',
      '-ss',
      startSec.toFixed(3),
      '-i',
      inputPath,
      '-t',
      durationSec.toFixed(3),
      '-vn',
      '-ac',
      '1',
      '-ar',
      '16000',
      '-f',
      'wav',
      outputPath,
    ];

    logger.info({ inputPath, outputPath, startSec }, 'Extracting clip audio proxy');

    return new Promise((resolve, reject) => {
      const proc = spawn(ffmpegPath, args);

      let errorData = '';
      proc.stderr.on('data', (data) => {
        errorData += data.toString();
      });

      proc.on('close', (code) => {
        if (code === 0 && existsSync(outputPath)) {
          resolve(outputPath);
        } else {
          logger.error({ code, errorData }, 'Clip audio proxy extraction failed');
          reject(new Error(`FFmpeg proxy extraction failed: ${code}`));
        }
      });
    });
  },

  /**
   * Generate a visual preview (thumbnail) for a clip.
   * Extracts the middle frame of the segment.
   */
  async generateClipPreview(inputPath: string, outputDir: string, timeMs: number): Promise<string> {
    if (!existsSync(inputPath)) {
      throw new Error(`Input file not found: ${inputPath}`);
    }

    const timeSec = timeMs / 1000;
    const fileName = `preview_${randomUUID()}.jpg`;
    const outputPath = join(outputDir, fileName);

    // Fast seek to time, extract 1 frame, scale to 480px height
    const args = [
      '-y',
      '-ss',
      timeSec.toFixed(3),
      '-i',
      inputPath,
      '-frames:v',
      '1',
      '-vf',
      'scale=-1:480',
      '-q:v',
      '2', // High quality JPEG
      outputPath,
    ];

    logger.debug({ inputPath, timeSec }, 'Generating clip preview');

    return new Promise((resolve) => {
      const proc = spawn(ffmpegPath, args);

      proc.on('close', (code) => {
        if (code === 0 && existsSync(outputPath)) {
          resolve(fileName); // Return filename only (relative to outputDir/uploads)
        } else {
          logger.warn({ code }, 'Preview generation failed');
          // Do not reject, just return empty string to avoid failing the job
          resolve('');
        }
      });

      proc.on('error', (err) => {
        logger.error({ err }, 'Preview generation process error');
        resolve('');
      });
    });
  },

  /**
   * Generate a short video preview clip (2-3 seconds) for playback.
   */
  async generateClipVideoPreview(
    inputPath: string,
    outputDir: string,
    startMs: number,
    endMs: number,
  ): Promise<string> {
    if (!existsSync(inputPath)) {
      throw new Error(`Input file not found: ${inputPath}`);
    }

    const midpointMs = (startMs + endMs) / 2;
    const previewDurationMs = Math.min(3000, endMs - startMs);
    const previewStartMs = Math.max(0, midpointMs - previewDurationMs / 2);

    const startSec = previewStartMs / 1000;
    const durationSec = previewDurationMs / 1000;

    const fileName = `clip_${randomUUID()}.mp4`;
    const outputPath = join(outputDir, fileName);

    const args = [
      '-y',
      '-ss',
      startSec.toFixed(3),
      '-i',
      inputPath,
      '-t',
      durationSec.toFixed(3),
      '-vf',
      'scale=-2:480',
      '-c:v',
      'libx264',
      '-preset',
      'veryfast',
      '-crf',
      '28',
      '-c:a',
      'aac',
      '-b:a',
      '96k',
      '-movflags',
      '+faststart',
      outputPath,
    ];

    logger.debug({ inputPath, startSec, durationSec }, 'Generating video clip preview');

    return new Promise((resolve) => {
      const proc = spawn(ffmpegPath, args);

      proc.on('close', (code) => {
        if (code === 0 && existsSync(outputPath)) {
          resolve(fileName);
        } else {
          logger.warn({ code }, 'Video clip generation failed');
          resolve('');
        }
      });

      proc.on('error', (err) => {
        logger.error({ err }, 'Video clip generation error');
        resolve('');
      });
    });
  },
};
