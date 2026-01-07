/**
 * @module loop/utils
 * @description Shared utilities and constants for the loop video processing module.
 *
 * This module provides:
 * - Directory management for loop output files
 * - Video duration extraction using FFmpeg
 * - Resolution presets for various aspect ratios
 * - Janitor functions for cleaning up old files
 */

import { join } from "path";
import { existsSync } from "fs";
import { mkdir, unlink, readdir, stat } from "fs/promises";
import { exec } from "child_process";
import { promisify } from "util";
import { env } from "@/config/env";
import { getFFmpegPath } from "@/modules/export/ffmpeg/ffmpeg-binary";
import { logger } from "@/lib/logger";

/** Promisified exec for async shell commands */
export const execAsync = promisify(exec);

/** Base directory for loop output files */
export const LOOPS_DIR = join(env.MEDIA_INPUT_DIR, "loops");

/**
 * Ensures the loops directory exists, creating it if necessary.
 * @returns A promise that resolves when the directory is ready.
 */
export async function ensureLoopsDir(): Promise<void> {
  if (!existsSync(LOOPS_DIR)) {
    await mkdir(LOOPS_DIR, { recursive: true });
  }
}

/**
 * Standard resolution presets for various aspect ratios.
 * All resolutions are 1080p-based for quality consistency.
 */
export const RESOLUTIONS: Record<string, { w: number; h: number }> = {
  "16:9": { w: 1920, h: 1080 }, // Landscape HD
  "9:16": { w: 1080, h: 1920 }, // Portrait/Stories
  "1:1": { w: 1080, h: 1080 }, // Square
  "4:5": { w: 1080, h: 1350 }, // Instagram Portrait
};

/**
 * Extracts video duration in seconds using FFmpeg.
 *
 * @param path - Absolute path to the video file.
 * @returns Duration in seconds, or 0 if extraction fails.
 *
 * @example
 * ```ts
 * const duration = await getVideoDuration('/path/to/video.mp4');
 * console.log(`Video is ${duration} seconds long`);
 * ```
 */
export async function getVideoDuration(path: string): Promise<number> {
  const cmd = `${getFFmpegPath()} -i "${path}" -hide_banner`;
  try {
    const { stderr } = await execAsync(cmd);
    const match = stderr.match(/Duration: (\d{2}):(\d{2}):(\d{2}\.\d{2})/);
    if (match) {
      const h = match[1] ?? "0";
      const m = match[2] ?? "0";
      const s = match[3] ?? "0";
      return parseFloat(h) * 3600 + parseFloat(m) * 60 + parseFloat(s);
    }
    return 0;
  } catch (e: unknown) {
    // ffmpeg returns exit 1 on no output, but info is in stderr
    const error = e as { stderr?: string };
    if (error.stderr) {
      const match = error.stderr.match(
        /Duration: (\d{2}):(\d{2}):(\d{2}\.\d{2})/
      );
      if (match) {
        const h = match[1] ?? "0";
        const m = match[2] ?? "0";
        const s = match[3] ?? "0";
        return parseFloat(h) * 3600 + parseFloat(m) * 60 + parseFloat(s);
      }
    }
    return 0;
  }
}

/**
 * Janitor function to cleanup old loop files.
 * Deletes files older than the specified age to prevent disk bloat.
 *
 * @param maxAgeMs - Maximum file age in milliseconds. Default: 1 hour (3600000ms).
 *
 * @example
 * ```ts
 * // Cleanup files older than 2 hours
 * await cleanupOldLoops(2 * 60 * 60 * 1000);
 * ```
 */
export async function cleanupOldLoops(
  maxAgeMs: number = 3600000
): Promise<void> {
  try {
    if (!existsSync(LOOPS_DIR)) return;

    const files = await readdir(LOOPS_DIR);
    const now = Date.now();
    let deletedCount = 0;

    for (const file of files) {
      if (
        !file.endsWith(".mp4") &&
        !file.endsWith(".gif") &&
        !file.endsWith(".png")
      )
        continue;

      const filePath = join(LOOPS_DIR, file);
      try {
        const stats = await stat(filePath);
        if (now - stats.mtimeMs > maxAgeMs) {
          await unlink(filePath);
          deletedCount++;
        }
      } catch {
        // Ignore stat/unlink errors for individual files
      }
    }

    if (deletedCount > 0) {
      logger.info({ deletedCount }, "Loop Janitor: Cleaned up old files");
    }
  } catch (err) {
    logger.error({ err }, "Loop Janitor failed");
  }
}
