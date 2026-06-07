/**
 * Video Metadata Service
 * Handles FFmpeg probing for metadata
 */

import { spawn } from 'node:child_process';

const ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg';

export const videoMetadataService = {
  /**
   * Get minimal video metadata (duration)
   */
  async getVideoMetadata(inputPath: string): Promise<{ duration: number }> {
    return new Promise((resolve) => {
      const args = ['-i', inputPath];
      const proc = spawn(ffmpegPath, args);
      let output = '';

      proc.stderr.on('data', (data) => {
        output += data.toString();
      });

      proc.on('close', () => {
        const match = output.match(/Duration:\s+(\d{2}):(\d{2}):(\d{2}\.\d+)/);
        if (match) {
          const hours = match[1];
          const minutes = match[2];
          const seconds = match[3];
          if (!hours || !minutes || !seconds) {
            resolve({ duration: 0 });
            return;
          }

          const duration =
            Number.parseFloat(hours) * 3600 +
            Number.parseFloat(minutes) * 60 +
            Number.parseFloat(seconds);
          resolve({ duration });
        } else {
          resolve({ duration: 0 });
        }
      });
    });
  },
};
