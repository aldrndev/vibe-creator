/**
 * @module reaction/utils
 * @description Shared utilities and constants for reaction video processing.
 *
 * This module provides:
 * - Directory management for reaction output files
 * - Resolution presets for various aspect ratios
 * - Position calculation for PiP overlays
 * - Janitor functions for cleaning up old files
 */

import { existsSync } from 'node:fs';
import { mkdir, readdir, stat, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { env } from '@/config/env';
import { logger } from '@/lib/logger';

/** Base directory for reaction output files */
export const REACTIONS_DIR = join(env.MEDIA_INPUT_DIR, 'reactions');

/**
 * Standard resolution presets for various aspect ratios.
 * All resolutions are 1080p-based for quality consistency.
 */
export const RESOLUTIONS: Record<string, { w: number; h: number }> = {
  '16:9': { w: 1920, h: 1080 }, // Landscape HD
  '9:16': { w: 1080, h: 1920 }, // Portrait/Stories
  '1:1': { w: 1080, h: 1080 }, // Square
  '4:5': { w: 1080, h: 1350 }, // Instagram Portrait
};

/**
 * Ensures the reactions directory exists, creating it if necessary.
 */
export async function ensureReactionsDir(): Promise<void> {
  if (!existsSync(REACTIONS_DIR)) {
    await mkdir(REACTIONS_DIR, { recursive: true });
  }
}

/** Predefined overlay positions for PiP videos */
export type OverlayPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

/**
 * Generates FFmpeg overlay position filter string.
 *
 * @param position - Corner position for the overlay
 * @param margin - Pixel margin from the edge
 * @param custom - Optional custom coordinates (overrides position)
 * @returns FFmpeg filter-compatible position string
 *
 * @example
 * ```ts
 * // Corner positioning
 * getOverlayPosition('bottom-right', 20); // "main_w-overlay_w-20:main_h-overlay_h-20"
 *
 * // Custom positioning
 * getOverlayPosition('top-left', 0, { x: 100, y: 50 }); // "100:50"
 * ```
 */
export function getOverlayPosition(
  position: OverlayPosition,
  margin: number,
  custom?: { x: number; y: number },
): string {
  if (custom) {
    return `${Math.round(custom.x)}:${Math.round(custom.y)}`;
  }

  switch (position) {
    case 'top-left':
      return `${margin}:${margin}`;
    case 'top-right':
      return `main_w-overlay_w-${margin}:${margin}`;
    case 'bottom-left':
      return `${margin}:main_h-overlay_h-${margin}`;
    case 'bottom-right':
      return `main_w-overlay_w-${margin}:main_h-overlay_h-${margin}`;
  }
}

/**
 * Janitor function to cleanup old reaction files.
 * Deletes files older than the specified age to prevent disk bloat.
 *
 * @param maxAgeMs - Maximum file age in milliseconds
 *
 * @example
 * ```ts
 * // Cleanup files older than 2 hours
 * await cleanupOldReactions(2 * 60 * 60 * 1000);
 * ```
 */
export async function cleanupOldReactions(maxAgeMs: number): Promise<void> {
  try {
    if (!existsSync(REACTIONS_DIR)) return;

    const files = await readdir(REACTIONS_DIR);
    const now = Date.now();
    let deletedCount = 0;

    for (const file of files) {
      if (!file.endsWith('.mp4')) continue;

      const filePath = join(REACTIONS_DIR, file);
      try {
        const stats = await stat(filePath);
        if (now - stats.mtimeMs > maxAgeMs) {
          await unlink(filePath);
          deletedCount++;
        }
      } catch {
        // ignore error for single file
      }
    }

    if (deletedCount > 0) {
      logger.info({ deletedCount }, 'Cleaned up old reaction files');
    }
  } catch (error) {
    logger.error({ error }, 'Failed to cleanup reaction files');
  }
}
