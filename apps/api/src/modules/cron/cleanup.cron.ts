import { readdir, stat, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { env } from '@/config/env';
import { logger } from '@/lib/logger';

const CLEANUP_DIRS = ['uploads/temp', 'uploads/director/previews', 'uploads/downloads'];

const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

export const cleanupCron = {
  /**
   * Start the cleanup job
   */
  start() {
    logger.info('Starting cleanup cron job (1h check interval, 24h retention)');

    // Run immediately on startup (with delay to let app boot)
    setTimeout(() => this.run(), 5000);

    // Run every 1 hour
    setInterval(() => this.run(), 60 * 60 * 1000);
  },

  async run() {
    logger.debug('Running scheduled cleanup...');
    for (const dir of CLEANUP_DIRS) {
      await this.cleanDir(join(env.MEDIA_INPUT_DIR, dir.replace('uploads/', '')));
    }
  },

  async cleanDir(dirPath: string) {
    try {
      const files = await readdir(dirPath);
      const now = Date.now();
      let count = 0;
      let freedBytes = 0;

      for (const file of files) {
        if (file === '.gitkeep') continue;
        const filePath = join(dirPath, file);
        try {
          const stats = await stat(filePath);
          if (now - stats.mtimeMs > MAX_AGE_MS) {
            await unlink(filePath);
            count++;
            freedBytes += stats.size;
          }
        } catch {
          // Ignore file access errors
        }
      }

      if (count > 0) {
        logger.info(
          {
            dir: dirPath,
            count,
            freedMB: Math.round(freedBytes / 1024 / 1024),
          },
          'Cleaned up old files',
        );
      }
    } catch {
      // Directory might not exist or other error
      // logger.debug({ dir: dirPath, err }, "Cleanup skip (dir presumably empty/missing)");
    }
  },
};
