/**
 * Video Export Service
 * Handles final video assembly and export
 */

import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { logger } from '@/lib/logger';

const ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg';

export const videoExportService = {
  /**
   * Export final video from selected clips
   * - Extracts/Trims each clip
   * - Burns in subtitles if requested
   * - Concatenates into final video
   */
  async exportVideo(
    clips: {
      sourcePath: string;
      start: number;
      end: number;
      transcript?: {
        segments?: Array<{ startMs: number; endMs: number; text: string }>;
      };
    }[],
    outputDir: string,
    options: {
      includeSubtitles?: boolean;
      aspectRatio?: '9:16' | '16:9' | '1:1';
      quality?: '720p' | '1080p';
    } = {},
  ): Promise<string> {
    const fs = await import('node:fs/promises');
    const { join } = await import('node:path');

    // 1. Process each clip
    const clipPaths: string[] = [];

    for (let i = 0; i < clips.length; i++) {
      const clip = clips[i];
      if (!clip) continue;
      const clipId = randomUUID();
      const clipOutPath = join(outputDir, `temp_clip_${i}_${clipId}.mp4`);

      // Handle Subtitles
      let subtitlePath = '';
      const vfFilters: string[] = [];

      // Aspect Ratio / Scaling (Simple crop/scale for MVP)
      // Default 9:16 (1080x1920)
      vfFilters.push('scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920');

      if (options.includeSubtitles && clip.transcript?.segments) {
        // Generate SRT for this clip
        const srtContent = this.generateSRT(clip.transcript.segments);
        subtitlePath = join(outputDir, `temp_sub_${i}_${clipId}.srt`);
        await fs.writeFile(subtitlePath, srtContent);

        // Add subtitles filter
        const escapedPath = subtitlePath.replace(/\\/g, '/').replace(/:/g, '\\:');
        vfFilters.push(
          `subtitles='${escapedPath}':force_style='Fontname=Sans,FontSize=24,PrimaryColour=&H00FFFFFF,BackColour=&H80000000,BorderStyle=3,Outline=1,Shadow=0,MarginV=60'`,
        );
      }

      // Construct FFmpeg command for this clip
      const duration = clip.end - clip.start;
      const args = [
        '-y',
        '-ss',
        clip.start.toFixed(3),
        '-i',
        clip.sourcePath,
        '-t',
        duration.toFixed(3),
        '-vf',
        vfFilters.join(','),
        '-c:v',
        'libx264',
        '-preset',
        'veryfast',
        '-crf',
        '23',
        '-c:a',
        'aac',
        '-b:a',
        '128k',
        clipOutPath,
      ];

      logger.info({ i, args: args.join(' ') }, 'Processing export clip');

      await new Promise<void>((resolve, reject) => {
        const proc = spawn(ffmpegPath, args);
        proc.on('close', (code) => {
          if (code === 0) resolve();
          else reject(new Error(`Clip processing failed: ${code}`));
        });
      });

      clipPaths.push(clipOutPath);

      // Cleanup SRT
      if (subtitlePath && existsSync(subtitlePath)) {
        await fs.unlink(subtitlePath).catch(() => {});
      }
    }

    // 2. Concat Clips
    const listPath = join(outputDir, `concat_${randomUUID()}.txt`);
    const fileContent = clipPaths.map((p) => `file '${p}'`).join('\n');
    await fs.writeFile(listPath, fileContent);

    const finalName = `export_${randomUUID()}.mp4`;
    const finalPath = join(outputDir, finalName);

    const concatArgs = [
      '-y',
      '-f',
      'concat',
      '-safe',
      '0',
      '-i',
      listPath,
      '-c',
      'copy',
      finalPath,
    ];

    logger.info('Concatenating export clips');
    await new Promise<void>((resolve, reject) => {
      const proc = spawn(ffmpegPath, concatArgs);
      proc.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`Concat failed: ${code}`));
      });
    });

    // Cleanup temps
    await fs.unlink(listPath).catch(() => {});
    for (const p of clipPaths) {
      if (existsSync(p)) await fs.unlink(p).catch(() => {});
    }

    return finalName;
  },

  generateSRT(segments: Array<{ startMs: number; endMs: number; text: string }>): string {
    return segments
      .map((s, i) => {
        const start = this.formatSRTTime(s.startMs);
        const end = this.formatSRTTime(s.endMs);
        return `${i + 1}\n${start} --> ${end}\n${s.text}\n`;
      })
      .join('\n');
  },

  formatSRTTime(ms: number): string {
    const date = new Date(0, 0, 0, 0, 0, 0, ms);
    const h = date.getHours().toString().padStart(2, '0');
    const m = date.getMinutes().toString().padStart(2, '0');
    const s = date.getSeconds().toString().padStart(2, '0');
    const owl = date.getMilliseconds().toString().padStart(3, '0');
    return `${h}:${m}:${s},${owl}`;
  },
};
