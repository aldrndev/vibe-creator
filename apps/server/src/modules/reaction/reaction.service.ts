import { logger } from '@/lib/logger';
import { spawn } from 'child_process';
import { join } from 'path';
import { existsSync } from 'fs';
import { mkdir, readdir, stat, unlink } from 'fs/promises';
import { randomUUID } from 'crypto';
import { getFFmpegPath } from '@/modules/export/ffmpeg/ffmpeg-binary';
import { getVideoDuration, getVideoResolution } from '@/utils/video-info';

const REACTIONS_DIR = join(process.cwd(), 'uploads', 'reactions');

const RESOLUTIONS: Record<string, { w: number; h: number }> = {
  '16:9': { w: 1920, h: 1080 },
  '9:16': { w: 1080, h: 1920 },
  '1:1': { w: 1080, h: 1080 },
  '4:5': { w: 1080, h: 1350 },
};

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
  aspectRatio?: string;
  reactionVolume?: number;
  mainVolume?: number;
  circular?: boolean;
}

interface CreateSideBySideInput {
  leftVideoPath: string;
  rightVideoPath: string;
  layout: 'horizontal' | 'vertical';
  aspectRatio?: string;
  reactionVolume?: number;
  mainVolume?: number;
  splitRatio?: number; // 0.1 to 0.9, default 0.5 ratio of the Left/Top video
  smoothBorder?: boolean;
  overlayMode?: boolean;
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
    return this.createReactionMixedAudio(input);
  },

  /**
   * Create side-by-side video comparison
   */
  async createSideBySide(input: CreateSideBySideInput): Promise<string> {
    await ensureReactionsDir();
    
    const { leftVideoPath, rightVideoPath, layout, aspectRatio = '16:9', mainVolume = 1.0, reactionVolume = 0.8, splitRatio = 0.5 } = input;
    const { w: targetW, h: targetH } = RESOLUTIONS[aspectRatio] || { w: 1920, h: 1080 };

    // Security Gate: Check Durations
    const [leftDuration, rightDuration] = await Promise.all([
      getVideoDuration(leftVideoPath),
      getVideoDuration(rightVideoPath)
    ]);

    if (leftDuration > 300 * 1000 || rightDuration > 300 * 1000) {
      throw new Error('Video duration exceeds 5 minutes limit');
    }

    const outputId = randomUUID();
    const outputPath = join(REACTIONS_DIR, `${outputId}.mp4`);
    
    // For Side-by-Side with Split Ratio:
    let leftW, rightW, leftH, rightH;

    // Helper to round to nearest even number (required by libx264)
    const toEven = (n: number) => Math.floor(n / 2) * 2;

    if (layout === 'horizontal') {
        leftW = toEven(targetW * splitRatio);
        rightW = targetW - leftW;
        // Ensure rightW is also even
        if (rightW % 2 !== 0) {
           leftW -= 2; // Adjust left slightly to keep strict total or just simple calc
           rightW = toEven(targetW - leftW); 
           // Simpler: Just make both even, if there is a 1-2px gap it's fine (black bg), but hstack requires sum matching? 
           // Actually hstack just stacks them. 
           // We need to ensure leftW + rightW = targetW exactly if we want full width. 
           // If targetW is 1920 (even). leftW even. rightW MUST be even.
        }

        leftH = targetH;
        rightH = targetH;
    } else {
        // Vertical
        leftH = toEven(targetH * splitRatio);
        rightH = targetH - leftH;
        if (rightH % 2 !== 0) {
             // Adjust
             leftH -= 2;
             rightH = toEven(targetH - leftH);
        }
        
        leftW = targetW;
        rightW = targetW;
    }
    
    
    // Helper to generate Fill (Cover) Filter - Crops to fit
    // Overlay Mode: Main Video fills the entire canvas (underneath) if enabled
    // Otherwise, Main Video is scaled to its allocated slot (leftW/leftH)
    const isOverlayMode = input.overlayMode ?? false;
    const isSmoothBorder = input.smoothBorder ?? false;

    // Calculate dimensions
    // In Overlay Mode:
    // Main Video = Full Target Size
    // Reaction Video = Its allocated share size
    let mainW = leftW;
    let mainH = leftH;
    
    if (isOverlayMode) {
        mainW = targetW;
        mainH = targetH;
    }
    
    console.log('[Reaction Debug]', {
        layout,
        splitRatio: input.splitRatio,
        targetW, targetH,
        leftW, leftH,
        rightW, rightH,
        mainW, mainH,
        isOverlayMode,
        isSmoothBorder
    });

    // Helper to generate Fill (Cover) Filter
    const getFillFilter = (idx: number, w: number, h: number, outLabel: string) => {
       return `[${idx}:v]scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h}[${outLabel}]`;
    };

    const leftFilter = getFillFilter(0, mainW, mainH, 'left');
    const rightFilter = getFillFilter(1, rightW, rightH, 'right');
    
    // Feather Logic: Apply alpha gradient to the joining edge of the Reaction video
    // Only if smoothBorder is enabled
    // Increased feather size for smoother blending
    const featherSize = 150;
    let reactionFeatherFilter = '';
    
    if (isSmoothBorder) {
        if (layout === 'horizontal') {
            reactionFeatherFilter = `[right]format=yuva420p,geq=lum='p(X,Y)':a='if(lt(X,${featherSize}),(X/${featherSize})*255,255)'[right_processed]`;
        } else {
            reactionFeatherFilter = `[right]format=yuva420p,geq=lum='p(X,Y)':a='if(lt(Y,${featherSize}),(Y/${featherSize})*255,255)'[right_processed]`;
        }
    } else {
        // Pass through if no feather
        reactionFeatherFilter = `[right]copy[right_processed]`;
    }

    // Stack Logic using Overlay on Black Background to support transparency
    // Base: Black
    const baseFilter = `color=c=black:s=${targetW}x${targetH}[base]`;
    
    let stackFilter = '';
    // Position of Reaction Video remains calculated based on split
    // Horizontal: Reaction at LeftW (Right side)
    // Vertical: Reaction at LeftH (Bottom side)
    
    // Duration Logic: shortest=1 on ALL overlay steps to ensure strict termination
    if (layout === 'horizontal') {
        stackFilter = `[base][left]overlay=0:0:shortest=1[tmp1];[tmp1][right_processed]overlay=${leftW}:0:shortest=1[v]`;
    } else {
        stackFilter = `[base][left]overlay=0:0:shortest=1[tmp1];[tmp1][right_processed]overlay=0:${leftH}:shortest=1[v]`;
    }
    
    // duration=shortest will pick the Shortest stream (Cut mode)
    const audioFilter = `[0:a]volume=${mainVolume}[a0];[1:a]volume=${reactionVolume}[a1];[a0][a1]amix=inputs=2:duration=shortest[a]`;

    const filterComplex = `${leftFilter};${rightFilter};${reactionFeatherFilter};${baseFilter};${stackFilter};${audioFilter}`;
    
    return new Promise((resolve, reject) => {
      const args = [
        '-i', leftVideoPath,
        '-i', rightVideoPath,
        '-filter_complex', filterComplex,
        '-map', '[v]',
        '-map', '[a]',
        '-c:v', 'libx264',
        '-preset', 'ultrafast',
        '-crf', '23',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-y',
        outputPath,
      ];
      
      const process = spawn(getFFmpegPath(), args);
      let errorOutput = '';
      
      process.stderr.on('data', (data) => {
        errorOutput += data.toString();
        // logger.debug({ data: data.toString() }, 'ffmpeg sidebyside stderr');
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
  async createReactionMixedAudio(input: CreateReactionInput): Promise<string> {
    await ensureReactionsDir();
    
    const { mainVideoPath, reactionVideoPath, position, scale, margin, reactionVolume = 0.8, mainVolume = 1.0, circular, aspectRatio = '16:9' } = input;
    
    // Validate Duration (Max 5 mins)
    const [d1, d2] = await Promise.all([
      getVideoDuration(mainVideoPath),
      getVideoDuration(reactionVideoPath)
    ]);
    if (d1 > 300 * 1000 || d2 > 300 * 1000) throw new Error('Video duration exceeds 5 minutes limit');

    const outputId = randomUUID();
    const outputPath = join(REACTIONS_DIR, `${outputId}.mp4`);
    const ffmpegPath = getFFmpegPath();

    const { w: targetW, h: targetH } = RESOLUTIONS[aspectRatio] || RESOLUTIONS['16:9']!;
    const overlayPos = getOverlayPosition(position, margin);
    
    // Smart Scaling Logic:
    // prevent vertical PiP from being too tall on landscape canvas
    const { width: pipSrcW, height: pipSrcH } = await getVideoResolution(reactionVideoPath);
    const pipSrcAspect = pipSrcW / pipSrcH;
    const targetAspect = targetW / targetH;
    
    let pipW = Math.round(targetW * scale);
    
    // If PiP is Vertical (aspect < 1) and Target is Landscape (aspect > 1)
    if (pipSrcAspect < 1 && targetAspect > 1) {
        const calculatedH = pipW / pipSrcAspect;
        // Cap max height at 80% of screen to prevent "Giant Tower" effect
        // Normal user expectation for "30%" width is a small box.
        // We auto-adjust if height exceeds 60% of target H
        if (calculatedH > targetH * 0.6) {
             pipW = Math.round((targetH * 0.6) * pipSrcAspect);
        }
    }
    
    // Step 1: Smart Blur Main Video [main]
    // Scales main video to fill background (blurred) and fit foreground
    const mainFilter = [
      `[0:v]split[bg][fg]`,
      `[bg]scale=${targetW}:${targetH}:force_original_aspect_ratio=increase,crop=${targetW}:${targetH},boxblur=20:10[bg_blurred]`,
      `[fg]scale=${targetW}:${targetH}:force_original_aspect_ratio=decrease[fg_scaled]`,
      `[bg_blurred][fg_scaled]overlay=(W-w)/2:(H-h)/2[main]`
    ].join(';');
    
    // Step 2: Prepare PiP [pip]
    let pipFilter = '';
    
    // Use geq for circle mask (computationally expensive but works without external files)
    // For 1080p output, scaling PiP first (e.g. 300px) creates a small surface for geq, so it's fast enough.
    if (circular) {
        // Crop to square -> Scale to pipW -> Circle Mask
        pipFilter = `[1:v]crop='min(iw,ih):min(iw,ih):(iw-ow)/2:(ih-oh)/2',scale=${pipW}:${pipW}[pip_square];[pip_square]format=rgba,geq='r=r(X,Y):a=if(lte(hypot(X-W/2,Y-H/2),W/2),255,0)'[pip]`;
    } else {
        // Scale keeping aspect ratio
        pipFilter = `[1:v]scale=${pipW}:-1[pip]`;
    }
    
    // Step 3: Overlay & Audio Mix
    // Note: overlayPos uses main_w/main_h vars from [main] and overlay_w/overlay_h from [pip]
    const overlayFilter = `[main][pip]overlay=${overlayPos}[v]`;
    const audioFilter = `[0:a]volume=${mainVolume}[a0];[1:a]volume=${reactionVolume}[a1];[a0][a1]amix=inputs=2:duration=shortest[a]`;
    
    const filterComplex = `${mainFilter};${pipFilter};${overlayFilter};${audioFilter}`;
    
    return new Promise((resolve, reject) => {
      const args = [
        '-i', mainVideoPath,
        '-i', reactionVideoPath,
        '-filter_complex', filterComplex,
        '-map', '[v]',
        '-map', '[a]',
        '-c:v', 'libx264',
        '-preset', 'ultrafast',
        '-crf', '23',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-y',
        outputPath,
      ];
      
      const process = spawn(ffmpegPath, args);
      let errorOutput = '';
      
      process.stderr.on('data', (data) => {
        errorOutput += data.toString();
        // logger.debug({ data: data.toString() }, 'ffmpeg reaction stderr');
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
   * Cleanup old files
   */
  async cleanupOldReactions(maxAgeMs: number): Promise<void> {
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
        } catch (err) {
            // ignore error for single file
        }
      }
      
      if (deletedCount > 0) {
        logger.info({ deletedCount }, 'Cleaned up old reaction files');
      }
    } catch (error) {
       logger.error({ error }, 'Failed to cleanup reaction files');
    }
  },
};
