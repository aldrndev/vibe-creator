import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { logger } from '@/lib/logger';
import { getFFmpegPath } from '@/modules/export/ffmpeg/ffmpeg-binary';
import { ensureLoopsDir, getVideoDuration, LOOPS_DIR } from '../loop.utils';

export interface CreateGifInput {
  inputPath: string;
  startMs?: number;
  endMs?: number;
  fps?: number;
  width?: number;
}

export async function processGif(input: CreateGifInput): Promise<string> {
  await ensureLoopsDir();
  const { inputPath, startMs = 0, endMs, fps = 15, width = 480 } = input;

  // Gate: Check Source Duration
  const durationSec = await getVideoDuration(inputPath);
  if (durationSec > 300) {
    throw new Error('Video duration exceeds limit (Max 5 Minutes)');
  }

  const outputId = randomUUID();
  const palettePath = join(LOOPS_DIR, `${outputId}_palette.png`);
  const outputPath = join(LOOPS_DIR, `${outputId}.gif`);

  const startSec = startMs / 1000;
  let trimFilter = '';

  if (endMs) {
    const duration = (endMs - startMs) / 1000;
    trimFilter = `trim=start=${startSec}:duration=${duration},setpts=PTS-STARTPTS,`;
  } else if (startMs > 0) {
    trimFilter = `trim=start=${startSec},setpts=PTS-STARTPTS,`;
  }

  // Two-pass for better quality GIF
  return new Promise((resolve, reject) => {
    // Pass 1: Generate palette
    const paletteArgs = [
      '-i',
      inputPath,
      '-vf',
      `${trimFilter}fps=${fps},scale=${width}:-1:flags=lanczos,palettegen`,
      '-y',
      palettePath,
    ];

    const paletteProcess = spawn(getFFmpegPath(), paletteArgs);

    paletteProcess.on('close', (paletteCode) => {
      if (paletteCode !== 0) {
        reject(new Error('Palette generation failed'));
        return;
      }

      // Pass 2: Create GIF with palette
      const gifArgs = [
        '-i',
        inputPath,
        '-i',
        palettePath,
        '-filter_complex',
        `${trimFilter}fps=${fps},scale=${width}:-1:flags=lanczos[x];[x][1:v]paletteuse`,
        '-y',
        outputPath,
      ];

      const gifProcess = spawn(getFFmpegPath(), gifArgs);
      let errorOutput = '';

      gifProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      gifProcess.on('close', async (code) => {
        // Clean up palette file
        try {
          await unlink(palettePath);
        } catch {
          // Ignore cleanup errors
        }

        if (code === 0) {
          logger.info({ outputPath }, 'GIF created');
          resolve(outputPath);
        } else {
          logger.error({ code, errorOutput }, 'GIF creation failed');
          reject(new Error(`FFmpeg failed with code ${code}`));
        }
      });

      gifProcess.on('error', (err) => {
        reject(new Error(`FFmpeg not found: ${err.message}`));
      });
    });

    paletteProcess.on('error', (err) => {
      reject(new Error(`FFmpeg not found: ${err.message}`));
    });
  });
}
