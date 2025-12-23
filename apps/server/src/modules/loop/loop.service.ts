import { logger } from '@/lib/logger';
import { spawn } from 'child_process';
import { join } from 'path';
import { existsSync } from 'fs';
import { mkdir, unlink } from 'fs/promises';
import { randomUUID } from 'crypto';

const LOOPS_DIR = join(process.cwd(), 'uploads', 'loops');

async function ensureLoopsDir() {
  if (!existsSync(LOOPS_DIR)) {
    await mkdir(LOOPS_DIR, { recursive: true });
  }
}

interface CreateLoopInput {
  inputPath: string;
  startMs?: number;
  endMs?: number;
  loopCount: number;
}

interface CreateBoomerangInput {
  inputPath: string;
  startMs?: number;
  endMs?: number;
}

interface CreateGifInput {
  inputPath: string;
  startMs?: number;
  endMs?: number;
  fps?: number;
  width?: number;
}

/**
 * Loop service for creating looping videos
 */
export const loopService = {
  /**
   * Create a looped video by repeating segment
   */
  async createLoop(input: CreateLoopInput): Promise<string> {
    await ensureLoopsDir();
    
    const { inputPath, startMs = 0, endMs, loopCount } = input;
    const outputId = randomUUID();
    const outputPath = join(LOOPS_DIR, `${outputId}.mp4`);
    
    // Build filter for trimming and looping
    const startSec = startMs / 1000;
    const filters: string[] = [];
    
    if (endMs) {
      const duration = (endMs - startMs) / 1000;
      filters.push(`trim=start=${startSec}:duration=${duration}`);
      filters.push('setpts=PTS-STARTPTS');
    } else if (startMs > 0) {
      filters.push(`trim=start=${startSec}`);
      filters.push('setpts=PTS-STARTPTS');
    }
    
    // Loop the video
    filters.push(`loop=${loopCount}:size=32767:start=0`);
    
    const filterString = filters.join(',');
    
    return new Promise((resolve, reject) => {
      const args = [
        '-i', inputPath,
        '-filter_complex', `[0:v]${filterString}[v];[0:a]aloop=${loopCount}:size=2e+09[a]`,
        '-map', '[v]',
        '-map', '[a]',
        '-c:v', 'libx264',
        '-c:a', 'aac',
        '-y',
        outputPath,
      ];
      
      const process = spawn('ffmpeg', args);
      let errorOutput = '';
      
      process.stderr.on('data', (data) => {
        errorOutput += data.toString();
        logger.debug({ data: data.toString() }, 'ffmpeg loop stderr');
      });
      
      process.on('close', (code) => {
        if (code === 0) {
          logger.info({ outputPath }, 'Loop video created');
          resolve(outputPath);
        } else {
          logger.error({ code, errorOutput }, 'Loop creation failed');
          reject(new Error(`FFmpeg failed with code ${code}`));
        }
      });
      
      process.on('error', (err) => {
        reject(new Error(`FFmpeg not found: ${err.message}`));
      });
    });
  },

  /**
   * Create boomerang effect (forward + reverse)
   */
  async createBoomerang(input: CreateBoomerangInput): Promise<string> {
    await ensureLoopsDir();
    
    const { inputPath, startMs = 0, endMs } = input;
    const outputId = randomUUID();
    const outputPath = join(LOOPS_DIR, `${outputId}.mp4`);
    
    const startSec = startMs / 1000;
    let trimFilter = '';
    
    if (endMs) {
      const duration = (endMs - startMs) / 1000;
      trimFilter = `trim=start=${startSec}:duration=${duration},setpts=PTS-STARTPTS,`;
    } else if (startMs > 0) {
      trimFilter = `trim=start=${startSec},setpts=PTS-STARTPTS,`;
    }
    
    // Create boomerang: forward + reverse
    const filterComplex = `[0:v]${trimFilter}split[v1][v2];[v2]reverse[vr];[v1][vr]concat=n=2:v=1:a=0[v]`;
    
    return new Promise((resolve, reject) => {
      const args = [
        '-i', inputPath,
        '-filter_complex', filterComplex,
        '-map', '[v]',
        '-an', // No audio for boomerang
        '-c:v', 'libx264',
        '-y',
        outputPath,
      ];
      
      const process = spawn('ffmpeg', args);
      let errorOutput = '';
      
      process.stderr.on('data', (data) => {
        errorOutput += data.toString();
        logger.debug({ data: data.toString() }, 'ffmpeg boomerang stderr');
      });
      
      process.on('close', (code) => {
        if (code === 0) {
          logger.info({ outputPath }, 'Boomerang video created');
          resolve(outputPath);
        } else {
          logger.error({ code, errorOutput }, 'Boomerang creation failed');
          reject(new Error(`FFmpeg failed with code ${code}`));
        }
      });
      
      process.on('error', (err) => {
        reject(new Error(`FFmpeg not found: ${err.message}`));
      });
    });
  },

  /**
   * Create GIF from video
   */
  async createGif(input: CreateGifInput): Promise<string> {
    await ensureLoopsDir();
    
    const { inputPath, startMs = 0, endMs, fps = 15, width = 480 } = input;
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
        '-i', inputPath,
        '-vf', `${trimFilter}fps=${fps},scale=${width}:-1:flags=lanczos,palettegen`,
        '-y',
        palettePath,
      ];
      
      const paletteProcess = spawn('ffmpeg', paletteArgs);
      
      paletteProcess.on('close', (paletteCode) => {
        if (paletteCode !== 0) {
          reject(new Error('Palette generation failed'));
          return;
        }
        
        // Pass 2: Create GIF with palette
        const gifArgs = [
          '-i', inputPath,
          '-i', palettePath,
          '-filter_complex', `${trimFilter}fps=${fps},scale=${width}:-1:flags=lanczos[x];[x][1:v]paletteuse`,
          '-y',
          outputPath,
        ];
        
        const gifProcess = spawn('ffmpeg', gifArgs);
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
  },
};
