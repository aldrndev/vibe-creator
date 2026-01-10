
import { exec } from 'child_process';
import { getFFprobePath } from '@/modules/export/ffmpeg/ffmpeg-binary';
import { logger } from '@/lib/logger';

/**
 * Get video duration in milliseconds
 */
export async function getVideoDuration(inputPath: string): Promise<number> {
  const ffprobePath = getFFprobePath();
  
  return new Promise((resolve, reject) => {
    // Command to get duration in seconds
    const cmd = `"${ffprobePath}" -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${inputPath}"`;
    
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        logger.error({ error, stderr }, 'Failed to get video duration');
        return reject(error);
      }
      
      const durationSec = parseFloat(stdout.trim());
      if (isNaN(durationSec)) {
        return reject(new Error('Invalid duration returned by ffprobe'));
      }
      
      resolve(durationSec * 1000); // Convert to ms
    });
  });
}

/**
 * Get video resolution (width, height)
 */
export async function getVideoResolution(inputPath: string): Promise<{ width: number; height: number }> {
    const ffprobePath = getFFprobePath();

    return new Promise((resolve, reject) => {
        const cmd = `"${ffprobePath}" -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 "${inputPath}"`;

        exec(cmd, (error, stdout, stderr) => {
            if (error) {
                logger.error({ error, stderr }, 'Failed to get video resolution');
                return reject(error);
            }

            const parts = stdout.trim().split('x');
            if (parts.length !== 2) {
                return reject(new Error('Invalid resolution format'));
            }

            const width = parseInt(parts[0] || '0', 10);
            const height = parseInt(parts[1] || '0', 10);

            if (isNaN(width) || isNaN(height)) {
                return reject(new Error('Invalid width/height'));
            }

            resolve({ width, height });
        });
    });
}
