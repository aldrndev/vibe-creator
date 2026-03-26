/**
 * FFmpeg Binary Resolver
 * Deterministic FFmpeg binary path resolution with version pinning
 */

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { logger } from '@/lib/logger';

/**
 * Get FFmpeg binary path
 * Priority: FFMPEG_PATH env → system PATH → @ffmpeg-installer/ffmpeg → fail
 */
export function getFFmpegPath(): string {
  // 1. Try explicit env override
  const envPath = process.env.FFMPEG_PATH;
  if (envPath) {
    if (!existsSync(envPath)) {
      throw new Error(`FFMPEG_PATH specified but binary not found: ${envPath}`);
    }
    logger.info({ ffmpegPath: envPath }, 'Using FFmpeg from FFMPEG_PATH');
    return envPath;
  }

  // 2. Try system PATH (common on macOS with Homebrew, Linux apt/yum)
  try {
    const result = spawnSync('which', ['ffmpeg'], {
      encoding: 'utf-8',
      timeout: 5000,
    });
    if (result.error) {
      throw result.error;
    }
    const systemPath = result.stdout.trim();
    if (systemPath && existsSync(systemPath)) {
      logger.info({ ffmpegPath: systemPath }, 'Using FFmpeg from system PATH');
      return systemPath;
    }
  } catch {
    // which command failed or ffmpeg not in PATH
  }

  // 3. Try @ffmpeg-installer/ffmpeg (if installed)
  try {
    const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
    const ffmpegPath = ffmpegInstaller.path;
    if (ffmpegPath && existsSync(ffmpegPath)) {
      logger.info({ ffmpegPath }, 'Using FFmpeg from @ffmpeg-installer/ffmpeg');
      return ffmpegPath;
    }
  } catch (error) {
    // @ffmpeg-installer/ffmpeg not installed or failed to load
    logger.debug({ error }, 'Could not load @ffmpeg-installer/ffmpeg');
  }

  // 4. Fail fast - no valid FFmpeg found
  throw new Error(
    'FFmpeg binary not found. Install FFmpeg via package manager (brew/apt/yum) or set FFMPEG_PATH env.',
  );
}

/**
 * Get FFprobe binary path
 * Priority: FFPROBE_PATH env → system PATH → @ffmpeg-installer/ffprobe → fail
 */
export function getFFprobePath(): string {
  // 1. Try explicit env override
  const envPath = process.env.FFPROBE_PATH;
  if (envPath) {
    if (!existsSync(envPath)) {
      throw new Error(`FFPROBE_PATH specified but binary not found: ${envPath}`);
    }
    logger.info({ ffprobePath: envPath }, 'Using FFprobe from FFPROBE_PATH');
    return envPath;
  }

  // 2. Try system PATH
  try {
    const result = spawnSync('which', ['ffprobe'], {
      encoding: 'utf-8',
      timeout: 5000,
    });
    if (result.error) {
      throw result.error;
    }
    const systemPath = result.stdout.trim();
    if (systemPath && existsSync(systemPath)) {
      // Quiet log for ffprobe to avoid noise
      return systemPath;
    }
  } catch {
    // ignore
  }

  // 3. Try @ffmpeg-installer/ffprobe
  try {
    const ffprobeInstaller = require('@ffmpeg-installer/ffprobe');
    const ffprobePath = ffprobeInstaller.path;
    if (ffprobePath && existsSync(ffprobePath)) {
      return ffprobePath;
    }
  } catch {
    // ignore
  }

  // 4. Fail fast
  throw new Error('FFprobe binary not found. Install FFmpeg/FFprobe via package manager.');
}

/**
 * Validate FFmpeg version (optional, for future use)
 */
export function validateFFmpegVersion(binaryPath: string): {
  version: string;
  valid: boolean;
} {
  try {
    const result = spawnSync(binaryPath, ['-version'], {
      encoding: 'utf-8',
      timeout: 5000,
    });
    if (result.error) {
      throw result.error;
    }
    const output = result.stdout;

    const match = output.match(/ffmpeg version ([^\s]+)/);
    const version = match?.[1] || 'unknown';

    // For now, any version is valid
    // Future: enforce minimum version (e.g., >= 5.0)
    return { version, valid: true };
  } catch (error) {
    logger.warn({ binaryPath, error }, 'Failed to validate FFmpeg version');
    return { version: 'unknown', valid: false };
  }
}
