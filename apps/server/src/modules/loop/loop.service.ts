import { logger } from '@/lib/logger';
import { spawn, exec } from 'child_process';
import { join } from 'path';
import { existsSync } from 'fs';
import { mkdir, unlink, readdir, stat } from 'fs/promises';
import { randomUUID } from 'crypto';
import { promisify } from 'util';

const execAsync = promisify(exec);

import { getFFmpegPath } from '@/modules/export/ffmpeg/ffmpeg-binary';

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
  aspectRatio?: '16:9' | '9:16' | '1:1' | '4:5' | '';
  crossfade?: boolean;
}

const RESOLUTIONS: Record<string, { w: number; h: number }> = {
  '16:9': { w: 1920, h: 1080 },
  '9:16': { w: 1080, h: 1920 },
  '1:1': { w: 1080, h: 1080 },
  '4:5': { w: 1080, h: 1350 },
};

interface CreateBoomerangInput {
  inputPath: string;
  startMs?: number;
  endMs?: number;
  loopCount?: number;
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
    
    // Gate 1: Check Duration
    const durationSec = await this.getVideoDuration(inputPath);
    if (durationSec > 300) { // 5 Mins
        throw new Error('Video duration exceeds limit (Max 5 Minutes)');
    }

    const outputId = randomUUID();
    const outputPath = join(LOOPS_DIR, `${outputId}.mp4`);
    
    // Build filter for trimming and looping
    const startSec = (startMs || 0) / 1000;
    let segDuration = 0;
    if (endMs) segDuration = (endMs - (startMs || 0)) / 1000;

    // --- 1. DETERMINE BASE STREAMS (vBase, aBase) ---
    // If seamless: We construct vBase/aBase via Shift & Dissolve from [0:v]/[0:a]
    // If normal: We construct vBase/aBase via simple Trim from [0:v]/[0:a]

    let baseFilter = '';
    let vLabel = '[v_base]';
    let aLabel = '[a_base]';

    const isSeamless = input.crossfade && endMs && (startMs !== undefined) && segDuration > 0;

    if (isSeamless) {
        // Shift & Dissolve Logic (Perfect Loop)
        const overlap = Math.min(2.0, segDuration * 0.3); // Max 2s overlap
        const midPoint = segDuration / 2;
        const xfadeOffset = (segDuration - midPoint) - overlap;

        // Video Shift
        baseFilter += `[0:v]split[vA_raw][vB_raw];`;
        // Part A: 0 to Mid (becomes Tail)
        baseFilter += `[vA_raw]trim=start=${startSec}:duration=${midPoint},setpts=PTS-STARTPTS[vPartA];`;
        // Part B: Mid to End (becomes Head)
        baseFilter += `[vB_raw]trim=start=${startSec + midPoint}:duration=${segDuration - midPoint},setpts=PTS-STARTPTS[vPartB];`;
        // Dissolve B into A (Original End -> Original Start)
        baseFilter += `[vPartB][vPartA]xfade=transition=fade:duration=${overlap}:offset=${xfadeOffset}${vLabel};`;

        // Audio Shift
        baseFilter += `[0:a]asplit[aA_raw][aB_raw];`;
        baseFilter += `[aA_raw]atrim=start=${startSec}:duration=${midPoint},asetpts=PTS-STARTPTS[aPartA];`;
        baseFilter += `[aB_raw]atrim=start=${startSec + midPoint}:duration=${segDuration - midPoint},asetpts=PTS-STARTPTS[aPartB];`;
        baseFilter += `[aPartB][aPartA]acrossfade=d=${overlap}:c1=tri:c2=tri${aLabel};`;
    } else {
        // Standard Trim Logic
        if (segDuration > 0) {
            baseFilter += `[0:v]trim=start=${startSec}:duration=${segDuration},setpts=PTS-STARTPTS${vLabel};`;
            baseFilter += `[0:a]atrim=start=${startSec}:duration=${segDuration},asetpts=PTS-STARTPTS${aLabel};`;
        } else {
            // No trimming (use full input, starting at startSec)
            baseFilter += `[0:v]trim=start=${startSec},setpts=PTS-STARTPTS${vLabel};`;
            baseFilter += `[0:a]atrim=start=${startSec},asetpts=PTS-STARTPTS${aLabel};`;
        }
    }

    // --- 2. ASPECT RATIO SCALING (Optional) ---
    // Takes vLabel -> Transforms -> New vLabel
    let scaleFilter = '';
    if (input.aspectRatio && RESOLUTIONS[input.aspectRatio]) {
        const { w, h } = RESOLUTIONS[input.aspectRatio]!;
        const vScaled = '[v_scaled]';
        scaleFilter = `${vLabel}split[bg][fg];` +
            `[bg]scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h},boxblur=20:10[bg_blurred];` +
            `[fg]scale=${w}:${h}:force_original_aspect_ratio=decrease[fg_scaled];` +
            `[bg_blurred][fg_scaled]overlay=(W-w)/2:(H-h)/2${vScaled};`;
        
        vLabel = vScaled; // Update pointer
    }

    // --- 3. LOOPING STRATEGY ---
    // loopCount in input represents "Total Plays".
    // FFmpeg loop filter and stream_loop option take "Repeats".
    // Repeats = Total Plays - 1.
    const repeats = Math.max(0, loopCount - 1);
    
    // If plays is high (> 5), use Two-Pass Strategy (Smart Stitching):
    const useSmartExtend = repeats > 5;
    
    if (useSmartExtend) {
        // --- PASS 1: Base Unit ---
        const baseId = randomUUID();
        const basePath = join(LOOPS_DIR, `${baseId}_base.mp4`);
        
        // Output the base stream directly (no loop filter)
        // Map vLabel -> [v], aLabel -> [a]
        const finalMap = `${vLabel}copy[v];${aLabel}copy[a]`;
        const pass1Filter = `${baseFilter}${scaleFilter}${finalMap}`;
        
        try {
            await new Promise<void>((resolve, reject) => {
                const args = [
                    '-i', inputPath,
                    '-filter_complex', pass1Filter,
                    '-map', '[v]',
                    '-map', '[a]',
                    '-c:v', 'libx264',
                    '-c:a', 'aac',
                    '-y',
                    basePath,
                ];
                const p = spawn(getFFmpegPath(), args);
                p.on('close', (code) => code === 0 ? resolve() : reject(new Error(`Pass 1 failed: ${code}`)));
                p.stderr.on('data', d => logger.debug({ data: d.toString() }, 'Pass 1 stderr'));
            });

            // --- PASS 2: Stream Copy Extend ---
            // ffmpeg -stream_loop {repeats} -i base.mp4 -c copy output.mp4
            await new Promise<void>((resolve, reject) => {
                 const args = [
                     '-stream_loop', repeats.toString(), // repeats
                     '-i', basePath,
                     '-c', 'copy',
                     '-y',
                     outputPath
                 ];
                 const p = spawn(getFFmpegPath(), args);
                 p.on('close', (code) => code === 0 ? resolve() : reject(new Error(`Pass 2 failed: ${code}`)));
                 p.stderr.on('data', d => logger.debug({ data: d.toString() }, 'Pass 2 stderr'));
            });
            
            // Cleanup Base
            await unlink(basePath).catch(e => logger.warn({ err: e }, 'Failed to cleanup base loop'));
            
            return outputPath;
            
        } catch (error) {
           // Cleanup on error
           if (existsSync(basePath)) await unlink(basePath).catch(() => {});
           throw error;
        }

    } else {
        // --- STANDARD SINGLE PASS ---
        const loopFilter = `${vLabel}loop=${repeats}:size=32767:start=0[v];${aLabel}aloop=${repeats}:size=2e+09:start=0[a]`;
        const filterComplex = `${baseFilter}${scaleFilter}${loopFilter}`;

        return new Promise((resolve, reject) => {
          const args = [
            '-i', inputPath,
            '-filter_complex', filterComplex,
            '-map', '[v]',
            '-map', '[a]',
            '-c:v', 'libx264',
            '-c:a', 'aac',
            '-y',
            outputPath,
          ];
          
          const process = spawn(getFFmpegPath(), args);
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
    }
  },

  /**
   * Create boomerang effect (forward + reverse)
   * Uses Smart Stitching (Stream Copy) for long loops
   */
  async createBoomerang(input: CreateBoomerangInput): Promise<string> {
    await ensureLoopsDir();
    
    // Default loopCount to 1 if not provided
    const { inputPath, startMs = 0, endMs, loopCount = 1 } = input;
    
    // Gate 1: Check Source Duration
    const durationSec = await this.getVideoDuration(inputPath);
    if (durationSec > 300) {
        throw new Error('Video duration exceeds limit (Max 5 Minutes)');
    }
    
    // Gate 2: Check Result Duration (Max 60s)
    let segDuration = durationSec;
    if (endMs) segDuration = (endMs - startMs) / 1000;
    
    const totalDuration = segDuration * 2 * loopCount;
    if (totalDuration > 60) {
         throw new Error(`Boomerang duration (${totalDuration.toFixed(1)}s) exceeds limit (Max 60 Seconds)`);
    }

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
    
    // Base Filter: Forward + Reverse Concat
    const baseFilter = `[0:v]${trimFilter}split[v1][v2];[v2]reverse[vr];[v1][vr]concat=n=2:v=1:a=0[v_base];`;
    
    // Logic: Total Plays = loopCount.
    // FFmpeg wrap: Base is 2 plays (Fwd+Rev).
    // Actually Boomerang = (Fwd+Rev). That is 1 "cycle".
    // So loopCount means N cycles.
    // Repeats = loopCount. (stream_loop takes repeats number? input loop takes repeats?)
    // -stream_loop N: loops N times. Total = N+1?
    // ffmpeg docs: -stream_loop 0 means no loop (play once). 1 means loop once (play 2 times).
    // So if loopCount is total plays, repeats = loopCount - 1.
    
    const repeats = Math.max(0, loopCount - 1);
    
    // Smart Extend Strategy (Threshold > 5)
    // Actually, creating base file is slightly costly (render).
    // But concat is invalid if we don't render base?
    // We can't stream copy a filter graph output without rendering it.
    // So we MUST render base first for boomerangs anyway if we want to loop it efficiently?
    // Actually, Boomerang ALWAYS requires re-encoding the Reverse part.
    // So Base Unit Render is unavoidable.
    // So we might as well ALWAYS use Smart Extend for loopCount > 1 to save re-encoding the loop?
    // Yes! If we create base (Fwd+Rev), we pay the render cost ONCE.
    // Then we just stream copy N times.
    // This is O(1) render cost vs O(N) render cost.
    // So we should ALWAYS use Smart Extend for Boomerang > 1.
    
    const useSmartExtend = repeats > 0; // Always use for >1 plays

    if (useSmartExtend) {
        // --- PASS 1: Render Base Unit ---
        const baseId = randomUUID();
        const basePath = join(LOOPS_DIR, `${baseId}_base.mp4`);
        const pass1Filter = `${baseFilter}[v_base]copy[v]`; // Map directly to output
        
        try {
             await new Promise<void>((resolve, reject) => {
                const args = [
                    '-i', inputPath,
                    '-filter_complex', pass1Filter,
                    '-map', '[v]',
                    '-an',
                    '-c:v', 'libx264',
                    '-y',
                    basePath,
                ];
                const p = spawn(getFFmpegPath(), args);
                p.on('close', (code) => code === 0 ? resolve() : reject(new Error(`Boomerang Pass 1 failed: ${code}`)));
                // p.stderr.on('data', d => logger.debug({ data: d.toString() }, 'Boomerang P1'));
            });

            // --- PASS 2: Stream Copy Loop ---
            await new Promise<void>((resolve, reject) => {
                 const args = [
                     '-stream_loop', repeats.toString(),
                     '-i', basePath,
                     '-c', 'copy',
                     '-y',
                     outputPath
                 ];
                 const p = spawn(getFFmpegPath(), args);
                 p.on('close', (code) => code === 0 ? resolve() : reject(new Error(`Boomerang Pass 2 failed: ${code}`)));
            });
            
            await unlink(basePath).catch(() => {});
            return outputPath;
            
        } catch (error) {
            if (existsSync(basePath)) await unlink(basePath).catch(() => {});
            throw error;
        }

    } else {
        // Fallback or Single Play (loopCount=1)
        // If loopCount=1, we just render base.
        // Or if we want to use the old hard loop filter logic for some reason.
        // But the new logic covers loopCount=1 (repeats=0). stream_loop 0.
        // It renders base, then stream copies 0 loops (total 1).
        // This is double IO but cleaner code.
        // Optimization: If repeats=0, just render directly to outputPath without Pass 2.
        
        // Let's keep it simple: Just use the standard single-pass logic for loopCount < 5 (avoid temp file IO overhead for small jobs)
        // For Boomerang, "Small Job" is subjective.
        
        const filterComplex = `${baseFilter}[v_base]loop=${repeats}:size=32767:start=0[v]`;
        
        return new Promise((resolve, reject) => {
          const args = [
            '-i', inputPath,
            '-filter_complex', filterComplex,
            '-map', '[v]',
            '-an',
            '-c:v', 'libx264',
            '-y',
            outputPath,
          ];
          const process = spawn(getFFmpegPath(), args);
          let errorOutput = '';
          process.stderr.on('data', d => errorOutput += d.toString());
          process.on('close', (code) => {
            if (code === 0) {
                logger.info({ outputPath }, 'Boomerang created');
                resolve(outputPath);
            } else {
                reject(new Error(`FFmpeg failed: ${code}`));
            }
          });
        });
    }
  },


  /**
   * Create GIF from video
   */
  async createGif(input: CreateGifInput): Promise<string> {
    await ensureLoopsDir();
    
    const { inputPath, startMs = 0, endMs, fps = 15, width = 480 } = input;

    // Gate: Check Source Duration
    const durationSec = await this.getVideoDuration(inputPath);
    if (durationSec > 300) { // 5 minutes = 300 seconds
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
        '-i', inputPath,
        '-vf', `${trimFilter}fps=${fps},scale=${width}:-1:flags=lanczos,palettegen`,
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
          '-i', inputPath,
          '-i', palettePath,
          '-filter_complex', `${trimFilter}fps=${fps},scale=${width}:-1:flags=lanczos[x];[x][1:v]paletteuse`,
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
  },

  /**
   * Cleanup old loop files (Janitor)
   * Deletes files older than maxAgeMs
   */
  async cleanupOldLoops(maxAgeMs: number = 3600000): Promise<void> {
    try {
      if (!existsSync(LOOPS_DIR)) return;
      
      const files = await readdir(LOOPS_DIR);
      const now = Date.now();
      let deletedCount = 0;
      
      for (const file of files) {
        if (!file.endsWith('.mp4') && !file.endsWith('.gif') && !file.endsWith('.png')) continue;
        
        const filePath = join(LOOPS_DIR, file);
        try {
            const stats = await stat(filePath);
            if (now - stats.mtimeMs > maxAgeMs) {
                await unlink(filePath);
                deletedCount++;
            }
        } catch (e) {
            // Ignore stat/unlink errors for individual files
        }
      }
      
      if (deletedCount > 0) {
        logger.info({ deletedCount }, 'Loop Janitor: Cleaned up old files');
      }
    } catch (err) {
      logger.error({ err }, 'Loop Janitor failed');
    }
  },

  /**
   * Helper to get video duration using ffmpeg
   */
  async getVideoDuration(path: string): Promise<number> {
    const cmd = `${getFFmpegPath()} -i "${path}" -hide_banner`;
    try {
        const { stderr } = await execAsync(cmd);
        const match = stderr.match(/Duration: (\d{2}):(\d{2}):(\d{2}\.\d{2})/);
        if (match) {
            const h = match[1] ?? '0';
            const m = match[2] ?? '0';
            const s = match[3] ?? '0';
            return (parseFloat(h) * 3600) + (parseFloat(m) * 60) + parseFloat(s);
        }
        return 0;
    } catch (e: any) {
        // ffmpeg returns exit 1 on no output, but info is in stderr
        if (e.stderr) {
             const match = e.stderr.match(/Duration: (\d{2}):(\d{2}):(\d{2}\.\d{2})/);
             if (match) {
                const h = match[1] ?? '0';
                const m = match[2] ?? '0';
                const s = match[3] ?? '0';
                return (parseFloat(h) * 3600) + (parseFloat(m) * 60) + parseFloat(s);
            }
        }
        return 0;
    }
  }
};
