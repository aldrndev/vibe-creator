import { spawn } from 'node:child_process';
import { logger } from '@/lib/logger';
import { assertSafeUrl } from '@/utils/ssrf';

export const downloadMetadataService = {
  /**
   * Get video metadata (duration, title) without downloading
   */
  async getVideoMetadata(url: string): Promise<{ duration: number; title: string; size?: number }> {
    await assertSafeUrl(url);

    return new Promise((resolve) => {
      const args = [
        '-J', // Dump JSON
        '--no-check-certificates',
        '--extractor-args',
        'youtube:player_client=android', // Match runYtDlp args for consistency
        url,
      ];

      const proc = spawn('yt-dlp', args);
      let output = '';
      let error = '';

      proc.stdout.on('data', (data) => (output += data.toString()));
      proc.stderr.on('data', (data) => (error += data.toString()));

      proc.on('close', (code) => {
        if (code !== 0) {
          logger.warn({ url, code, error }, 'Failed to get video metadata');
          // Resolve with defaults to allow soft-fail
          return resolve({ duration: 0, title: 'Unknown' });
        }

        try {
          const json = JSON.parse(output);
          resolve({
            duration: json.duration || 0,
            title: json.title || 'Unknown',
            size: json.filesize || 0,
          });
        } catch (err) {
          logger.warn({ err }, 'Failed to parse metadata JSON');
          resolve({ duration: 0, title: 'Unknown' });
        }
      });

      proc.on('error', (err) => {
        logger.warn({ err }, 'yt-dlp process error');
        resolve({ duration: 0, title: 'Unknown' });
      });
    });
  },
};
