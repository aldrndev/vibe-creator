import { spawn } from 'node:child_process';
import { logger } from '@/lib/logger';
import { getFFprobePath } from '@/modules/export/ffmpeg/ffmpeg-binary';

function runFfprobe(args: string[], errorMessage: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const process = spawn(getFFprobePath(), args, {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    process.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    process.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    process.on('error', (error) => {
      logger.error({ error }, errorMessage);
      reject(error);
    });

    process.on('close', (code) => {
      if (code !== 0) {
        logger.error({ code, stderr }, errorMessage);
        reject(new Error(errorMessage));
        return;
      }

      resolve(stdout.trim());
    });
  });
}

/**
 * Get video duration in milliseconds
 */
export async function getVideoDuration(inputPath: string): Promise<number> {
  const stdout = await runFfprobe(
    [
      '-v',
      'error',
      '-show_entries',
      'format=duration',
      '-of',
      'default=noprint_wrappers=1:nokey=1',
      inputPath,
    ],
    'Failed to get video duration',
  );

  const durationSec = parseFloat(stdout);
  if (Number.isNaN(durationSec)) {
    throw new Error('Invalid duration returned by ffprobe');
  }

  return durationSec * 1000;
}

/**
 * Get video resolution (width, height)
 */
export async function getVideoResolution(
  inputPath: string,
): Promise<{ width: number; height: number }> {
  const stdout = await runFfprobe(
    [
      '-v',
      'error',
      '-select_streams',
      'v:0',
      '-show_entries',
      'stream=width,height',
      '-of',
      'csv=s=x:p=0',
      inputPath,
    ],
    'Failed to get video resolution',
  );

  const parts = stdout.split('x');
  if (parts.length !== 2) {
    throw new Error('Invalid resolution format');
  }

  const width = parseInt(parts[0] || '0', 10);
  const height = parseInt(parts[1] || '0', 10);

  if (Number.isNaN(width) || Number.isNaN(height)) {
    throw new Error('Invalid width/height');
  }

  return { width, height };
}

/**
 * Detect whether the source video carries an audio stream before building FFmpeg filters.
 */
export async function hasVideoAudioStream(inputPath: string): Promise<boolean> {
  const stdout = await runFfprobe(
    [
      '-v',
      'error',
      '-select_streams',
      'a:0',
      '-show_entries',
      'stream=index',
      '-of',
      'csv=p=0',
      inputPath,
    ],
    'Failed to inspect video audio stream',
  );

  return stdout.length > 0;
}
