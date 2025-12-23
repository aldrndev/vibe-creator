import Ffmpeg from 'fluent-ffmpeg';
import { logger } from '@/lib/logger';

interface TrimOptions {
  inputPath: string;
  outputPath: string;
  startTime: number; // seconds
  endTime: number;   // seconds
}

interface ConcatOptions {
  inputPaths: string[];
  outputPath: string;
}

interface WatermarkOptions {
  inputPath: string;
  outputPath: string;
  watermarkText?: string;
  watermarkImage?: string;
}

/**
 * FFmpeg processor for server-side video processing
 */
export const ffmpegProcessor = {
  /**
   * Trim a video clip
   */
  async trim(options: TrimOptions): Promise<void> {
    const { inputPath, outputPath, startTime, endTime } = options;
    const duration = endTime - startTime;

    return new Promise((resolve, reject) => {
      Ffmpeg(inputPath)
        .setStartTime(startTime)
        .setDuration(duration)
        .outputOptions([
          '-c:v', 'libx264',
          '-c:a', 'aac',
          '-preset', 'fast',
          '-movflags', '+faststart',
        ])
        .output(outputPath)
        .on('start', (cmd) => {
          logger.info({ cmd }, 'FFmpeg trim started');
        })
        .on('progress', (progress) => {
          logger.debug({ progress: progress.percent }, 'FFmpeg trim progress');
        })
        .on('end', () => {
          logger.info('FFmpeg trim completed');
          resolve();
        })
        .on('error', (err) => {
          logger.error({ err }, 'FFmpeg trim failed');
          reject(err);
        })
        .run();
    });
  },

  /**
   * Concatenate multiple video clips
   */
  async concat(options: ConcatOptions): Promise<void> {
    const { inputPaths, outputPath } = options;

    return new Promise((resolve, reject) => {
      const cmd = Ffmpeg();

      // Add all inputs
      inputPaths.forEach(path => {
        cmd.input(path);
      });

      cmd
        .outputOptions([
          '-filter_complex', `concat=n=${inputPaths.length}:v=1:a=1[outv][outa]`,
          '-map', '[outv]',
          '-map', '[outa]',
          '-c:v', 'libx264',
          '-c:a', 'aac',
          '-preset', 'fast',
          '-movflags', '+faststart',
        ])
        .output(outputPath)
        .on('start', (cmdLine) => {
          logger.info({ cmd: cmdLine }, 'FFmpeg concat started');
        })
        .on('progress', (progress) => {
          logger.debug({ progress: progress.percent }, 'FFmpeg concat progress');
        })
        .on('end', () => {
          logger.info('FFmpeg concat completed');
          resolve();
        })
        .on('error', (err) => {
          logger.error({ err }, 'FFmpeg concat failed');
          reject(err);
        })
        .run();
    });
  },

  /**
   * Add watermark to video
   */
  async addWatermark(options: WatermarkOptions): Promise<void> {
    const { inputPath, outputPath, watermarkText } = options;

    return new Promise((resolve, reject) => {
      const text = watermarkText || 'Made with VibeCreator';
      
      Ffmpeg(inputPath)
        .outputOptions([
          '-vf', `drawtext=text='${text}':fontsize=24:fontcolor=white@0.5:x=w-tw-20:y=h-th-20`,
          '-c:v', 'libx264',
          '-c:a', 'copy',
          '-preset', 'fast',
        ])
        .output(outputPath)
        .on('start', (cmd) => {
          logger.info({ cmd }, 'FFmpeg watermark started');
        })
        .on('end', () => {
          logger.info('FFmpeg watermark completed');
          resolve();
        })
        .on('error', (err) => {
          logger.error({ err }, 'FFmpeg watermark failed');
          reject(err);
        })
        .run();
    });
  },

  /**
   * Get video duration
   */
  async getDuration(inputPath: string): Promise<number> {
    return new Promise((resolve, reject) => {
      Ffmpeg.ffprobe(inputPath, (err, metadata) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(metadata.format.duration || 0);
      });
    });
  },
};
