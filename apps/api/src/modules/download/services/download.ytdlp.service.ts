import { spawn } from 'node:child_process';
import { logger } from '@/lib/logger';
import { assertSafeUrl } from '@/utils/ssrf';
import { findAndRenameDownload } from '../download.utils';

export const YT_DLP_INFO_ARGS = [
  '--print',
  '%(title)s',
  '--print',
  '%(duration)s',
  '--skip-download',
  '--no-check-certificates',
  '--extractor-args',
  'youtube:player_client=android',
] as const;

export const YT_DLP_PRIMARY_FORMAT_SELECTOR =
  'bestvideo[ext=mp4]+bestaudio[ext=m4a]/bestvideo+bestaudio/best[ext=mp4]/best';

export const YT_DLP_FALLBACK_FORMAT_SELECTOR =
  'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best';

export function buildYtDlpInfoArgs(url: string): string[] {
  return [...YT_DLP_INFO_ARGS, url];
}

export function buildYtDlpDownloadArgs(
  url: string,
  outputPath: string,
  formatSelector: string,
): string[] {
  return [
    '-f',
    formatSelector,
    '--merge-output-format',
    'mp4',
    '--no-check-certificates',
    '--newline',
    '--no-playlist',
    '--extractor-args',
    'youtube:player_client=android',
    '-o',
    outputPath,
    url,
  ];
}

export const downloadYtDlpService = {
  /**
   * Run yt-dlp command (fallback)
   */
  async runYtDlp(
    url: string,
    outputPath: string,
    onProgress?: (percent: number) => void,
  ): Promise<{ title: string; metadata: Record<string, unknown> }> {
    await assertSafeUrl(url);

    return new Promise((resolve, reject) => {
      let title = 'Downloaded Video';
      let metadata: Record<string, unknown> = {};

      // First get video info with bypass options
      const infoProcess = spawn('yt-dlp', buildYtDlpInfoArgs(url));

      let infoOutput = '';
      infoProcess.stdout.on('data', (data) => {
        infoOutput += data.toString();
      });

      infoProcess.on('close', (infoCode) => {
        if (infoCode === 0) {
          const lines = infoOutput.trim().split('\n');
          title = lines[0] || 'Downloaded Video';
          metadata = { duration: lines[1] || '0', source: 'yt-dlp' };
        }

        // Then download with bypass options and PROGRESS
        const downloadProcess = spawn(
          'yt-dlp',
          buildYtDlpDownloadArgs(url, outputPath, YT_DLP_PRIMARY_FORMAT_SELECTOR),
        );

        let errorOutput = '';
        downloadProcess.stderr.on('data', (data) => {
          errorOutput += data.toString();
        });

        const parseProgress = (data: Buffer | string) => {
          const lines = data.toString().split('\n');
          for (const line of lines) {
            // Match decimal (45.5%) or integer (100%)
            const match = line.match(/\[download\]\s+(\d+(?:\.\d+)?)%/);
            if (match?.[1]) {
              const percent = parseFloat(match[1]);
              if (onProgress) {
                // Log only significant changes to avoid spamming logs too much, but enough for debug
                if (Math.round(percent) % 10 === 0 || percent >= 99) {
                  logger.info({ percent, line: line.trim() }, 'Matched download progress');
                }
                onProgress(percent);
              }
            }
          }
        };

        downloadProcess.stdout.on('data', parseProgress);
        downloadProcess.stderr.on('data', parseProgress); // Some versions use stderr

        downloadProcess.on('close', async (code) => {
          if (code === 0) {
            try {
              if (onProgress) onProgress(100);
              const finalPath = await findAndRenameDownload(outputPath);
              if (finalPath !== outputPath) {
                logger.info({ expected: outputPath, actual: finalPath }, 'Renamed yt-dlp output');
              }
              resolve({ title, metadata });
            } catch (renameErr) {
              reject(renameErr);
            }
          } else {
            reject(new Error(`yt-dlp failed with code ${code}: ${errorOutput}`));
          }
        });

        downloadProcess.on('error', () => {
          reject(new Error('yt-dlp not found. Install with: brew install yt-dlp'));
        });
      });

      infoProcess.on('error', () => {
        // Fallback flow if getting info fails
        const downloadProcess = spawn(
          'yt-dlp',
          buildYtDlpDownloadArgs(url, outputPath, YT_DLP_FALLBACK_FORMAT_SELECTOR),
        );

        downloadProcess.stdout.on('data', (data) => {
          const line = data.toString();
          const match = line.match(/\[download\]\s+(\d+\.\d+)%/);
          if (match?.[1]) {
            if (onProgress) onProgress(parseFloat(match[1]));
          }
        });

        downloadProcess.on('close', async (code) => {
          if (code === 0) {
            if (onProgress) onProgress(100);
            try {
              await findAndRenameDownload(outputPath);
              resolve({ title, metadata });
            } catch (renameErr) {
              reject(renameErr);
            }
          } else {
            reject(new Error('yt-dlp failed'));
          }
        });

        downloadProcess.on('error', () => {
          reject(new Error('yt-dlp not found. Install with: brew install yt-dlp'));
        });
      });
    });
  },
};
