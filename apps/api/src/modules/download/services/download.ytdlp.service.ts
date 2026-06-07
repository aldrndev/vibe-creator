import { spawn } from 'node:child_process';
import { logger } from '@/lib/logger';
import { assertSafeUrl } from '@/utils/ssrf';
import type { DownloadVideoOptions } from '../download.service';
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
  options?: DownloadVideoOptions,
): string[] {
  const args = [
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

  if (typeof options?.maxBytes === 'number') {
    const maxMegabytes = Math.max(1, Math.floor(options.maxBytes / 1024 / 1024));
    args.splice(args.length - 1, 0, '--max-filesize', `${maxMegabytes}M`);
  }

  return args;
}

function handleYtDlpProgress(data: Buffer | string, onProgress?: (percent: number) => void) {
  if (!onProgress) return;
  const lines = data.toString().split('\n');
  for (const line of lines) {
    const match = line.match(/\[download\]\s+(\d+(?:\.\d+)?)%/);
    if (match?.[1]) {
      const percent = Number.parseFloat(match[1]);
      if (Math.round(percent) % 10 === 0 || percent >= 99) {
        logger.info({ percent, line: line.trim() }, 'Matched download progress');
      }
      onProgress(percent);
    }
  }
}

async function handleYtDlpClose(
  code: number | null,
  outputPath: string,
  errorOutput: string,
  resolve: () => void,
  reject: (err: Error) => void,
  onProgress?: (percent: number) => void,
) {
  if (code !== 0) {
    reject(new Error(`yt-dlp failed with code ${code}: ${errorOutput}`));
    return;
  }

  try {
    if (onProgress) onProgress(100);
    const finalPath = await findAndRenameDownload(outputPath);
    if (finalPath !== outputPath) {
      logger.info({ expected: outputPath, actual: finalPath }, 'Renamed yt-dlp output');
    }
    resolve();
  } catch (renameErr) {
    reject(renameErr instanceof Error ? renameErr : new Error(String(renameErr)));
  }
}

async function executeYtDlpDownload(
  url: string,
  outputPath: string,
  formatSelector: string,
  options?: DownloadVideoOptions,
  onProgress?: (percent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const downloadProcess = spawn(
      'yt-dlp',
      buildYtDlpDownloadArgs(url, outputPath, formatSelector, options),
    );

    let errorOutput = '';
    downloadProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
      handleYtDlpProgress(data, onProgress);
    });
    downloadProcess.stdout.on('data', (data) => handleYtDlpProgress(data, onProgress));

    downloadProcess.on('close', (code) =>
      handleYtDlpClose(code, outputPath, errorOutput, resolve, reject, onProgress),
    );

    downloadProcess.on('error', () => {
      reject(new Error('yt-dlp not found. Install with: brew install yt-dlp'));
    });
  });
}

export const downloadYtDlpService = {
  /**
   * Run yt-dlp command (fallback)
   */
  async runYtDlp(
    url: string,
    outputPath: string,
    onProgress?: (percent: number) => void,
    options?: DownloadVideoOptions,
  ): Promise<{ title: string; metadata: Record<string, unknown> }> {
    await assertSafeUrl(url);

    return new Promise((resolve, reject) => {
      let title = 'Downloaded Video';
      let metadata: Record<string, unknown> = {};

      const infoProcess = spawn('yt-dlp', buildYtDlpInfoArgs(url));

      let infoOutput = '';
      infoProcess.stdout.on('data', (data) => {
        infoOutput += data.toString();
      });

      infoProcess.on('close', async (infoCode) => {
        if (infoCode === 0) {
          const lines = infoOutput.trim().split('\n');
          title = lines[0] || 'Downloaded Video';
          metadata = { duration: lines[1] || '0', source: 'yt-dlp' };
        }

        try {
          await executeYtDlpDownload(
            url,
            outputPath,
            YT_DLP_PRIMARY_FORMAT_SELECTOR,
            options,
            onProgress,
          );
          resolve({ title, metadata });
        } catch (err) {
          reject(err);
        }
      });

      infoProcess.on('error', async () => {
        try {
          await executeYtDlpDownload(
            url,
            outputPath,
            YT_DLP_FALLBACK_FORMAT_SELECTOR,
            options,
            onProgress,
          );
          resolve({ title, metadata });
        } catch (err) {
          reject(err);
        }
      });
    });
  },
};
