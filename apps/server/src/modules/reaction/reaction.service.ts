import { logger } from '@/lib/logger';
import { spawn } from 'child_process';
import { join } from 'path';
import { existsSync } from 'fs';
import { mkdir } from 'fs/promises';
import { randomUUID } from 'crypto';

const REACTIONS_DIR = join(process.cwd(), 'uploads', 'reactions');

async function ensureReactionsDir() {
  if (!existsSync(REACTIONS_DIR)) {
    await mkdir(REACTIONS_DIR, { recursive: true });
  }
}

type OverlayPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

interface CreateReactionInput {
  mainVideoPath: string;
  reactionVideoPath: string;
  position: OverlayPosition;
  scale: number; // 0.1 to 0.5 (10% to 50% of main video size)
  margin: number; // pixels from edge
}

interface CreateSideBySideInput {
  leftVideoPath: string;
  rightVideoPath: string;
  layout: 'horizontal' | 'vertical';
}

/**
 * Get overlay position filter string
 */
function getOverlayPosition(position: OverlayPosition, margin: number): string {
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
 * Reaction service for creating picture-in-picture videos
 */
export const reactionService = {
  /**
   * Create reaction video with PiP overlay
   */
  async createReaction(input: CreateReactionInput): Promise<string> {
    await ensureReactionsDir();
    
    const { mainVideoPath, reactionVideoPath, position, scale, margin } = input;
    const outputId = randomUUID();
    const outputPath = join(REACTIONS_DIR, `${outputId}.mp4`);
    
    const overlayPos = getOverlayPosition(position, margin);
    
    // Scale overlay video and position it
    const filterComplex = [
      `[0:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2[main]`,
      `[1:v]scale=iw*${scale}:ih*${scale}[pip]`,
      `[main][pip]overlay=${overlayPos}[v]`,
    ].join(';');
    
    return new Promise((resolve, reject) => {
      const args = [
        '-i', mainVideoPath,
        '-i', reactionVideoPath,
        '-filter_complex', filterComplex,
        '-map', '[v]',
        '-map', '0:a', // Use main video audio
        '-c:v', 'libx264',
        '-c:a', 'aac',
        '-shortest', // End when shortest input ends
        '-y',
        outputPath,
      ];
      
      const process = spawn('ffmpeg', args);
      let errorOutput = '';
      
      process.stderr.on('data', (data) => {
        errorOutput += data.toString();
        logger.debug({ data: data.toString() }, 'ffmpeg reaction stderr');
      });
      
      process.on('close', (code) => {
        if (code === 0) {
          logger.info({ outputPath }, 'Reaction video created');
          resolve(outputPath);
        } else {
          logger.error({ code, errorOutput }, 'Reaction creation failed');
          reject(new Error(`FFmpeg failed with code ${code}`));
        }
      });
      
      process.on('error', (err) => {
        reject(new Error(`FFmpeg not found: ${err.message}`));
      });
    });
  },

  /**
   * Create side-by-side video comparison
   */
  async createSideBySide(input: CreateSideBySideInput): Promise<string> {
    await ensureReactionsDir();
    
    const { leftVideoPath, rightVideoPath, layout } = input;
    const outputId = randomUUID();
    const outputPath = join(REACTIONS_DIR, `${outputId}.mp4`);
    
    let filterComplex: string;
    
    if (layout === 'horizontal') {
      // Side by side (left | right)
      filterComplex = [
        '[0:v]scale=960:1080:force_original_aspect_ratio=decrease,pad=960:1080:(ow-iw)/2:(oh-ih)/2[left]',
        '[1:v]scale=960:1080:force_original_aspect_ratio=decrease,pad=960:1080:(ow-iw)/2:(oh-ih)/2[right]',
        '[left][right]hstack=inputs=2[v]',
      ].join(';');
    } else {
      // Stacked (top / bottom)
      filterComplex = [
        '[0:v]scale=1920:540:force_original_aspect_ratio=decrease,pad=1920:540:(ow-iw)/2:(oh-ih)/2[top]',
        '[1:v]scale=1920:540:force_original_aspect_ratio=decrease,pad=1920:540:(ow-iw)/2:(oh-ih)/2[bottom]',
        '[top][bottom]vstack=inputs=2[v]',
      ].join(';');
    }
    
    return new Promise((resolve, reject) => {
      const args = [
        '-i', leftVideoPath,
        '-i', rightVideoPath,
        '-filter_complex', filterComplex,
        '-map', '[v]',
        '-map', '0:a', // Use left video audio
        '-c:v', 'libx264',
        '-c:a', 'aac',
        '-shortest',
        '-y',
        outputPath,
      ];
      
      const process = spawn('ffmpeg', args);
      let errorOutput = '';
      
      process.stderr.on('data', (data) => {
        errorOutput += data.toString();
        logger.debug({ data: data.toString() }, 'ffmpeg sidebyside stderr');
      });
      
      process.on('close', (code) => {
        if (code === 0) {
          logger.info({ outputPath }, 'Side-by-side video created');
          resolve(outputPath);
        } else {
          logger.error({ code, errorOutput }, 'Side-by-side creation failed');
          reject(new Error(`FFmpeg failed with code ${code}`));
        }
      });
      
      process.on('error', (err) => {
        reject(new Error(`FFmpeg not found: ${err.message}`));
      });
    });
  },

  /**
   * Create reaction with mixed audio
   */
  async createReactionMixedAudio(input: CreateReactionInput & { reactionVolume: number }): Promise<string> {
    await ensureReactionsDir();
    
    const { mainVideoPath, reactionVideoPath, position, scale, margin, reactionVolume } = input;
    const outputId = randomUUID();
    const outputPath = join(REACTIONS_DIR, `${outputId}.mp4`);
    
    const overlayPos = getOverlayPosition(position, margin);
    
    // Scale overlay video, position it, and mix audio
    const filterComplex = [
      `[0:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2[main]`,
      `[1:v]scale=iw*${scale}:ih*${scale}[pip]`,
      `[main][pip]overlay=${overlayPos}[v]`,
      `[0:a]volume=1.0[a0]`,
      `[1:a]volume=${reactionVolume}[a1]`,
      `[a0][a1]amix=inputs=2:duration=shortest[a]`,
    ].join(';');
    
    return new Promise((resolve, reject) => {
      const args = [
        '-i', mainVideoPath,
        '-i', reactionVideoPath,
        '-filter_complex', filterComplex,
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
        logger.debug({ data: data.toString() }, 'ffmpeg reaction mixed stderr');
      });
      
      process.on('close', (code) => {
        if (code === 0) {
          logger.info({ outputPath }, 'Reaction video with mixed audio created');
          resolve(outputPath);
        } else {
          logger.error({ code, errorOutput }, 'Reaction creation failed');
          reject(new Error(`FFmpeg failed with code ${code}`));
        }
      });
      
      process.on('error', (err) => {
        reject(new Error(`FFmpeg not found: ${err.message}`));
      });
    });
  },
};
