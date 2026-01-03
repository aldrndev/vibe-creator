import { prisma } from '@/lib/prisma';
import { ffmpegProcessor } from './ffmpeg.processor';
import { logger } from '@/lib/logger';
import { join } from 'path';
import { unlink, mkdir, copyFile } from 'fs/promises';
import { existsSync } from 'fs';
import { randomUUID } from 'crypto';
import { cancelExportJob } from './export-cancel';

const EXPORTS_DIR = join(process.cwd(), 'uploads', 'exports');
const TEMP_DIR = join(process.cwd(), 'uploads', 'temp');

// Ensure directories exist
async function ensureDirectories() {
  if (!existsSync(EXPORTS_DIR)) {
    await mkdir(EXPORTS_DIR, { recursive: true });
  }
  if (!existsSync(TEMP_DIR)) {
    await mkdir(TEMP_DIR, { recursive: true });
  }
}

interface TimelineData {
  clips: Array<{
    localPath: string;
    startTime: number;
    endTime: number;
    transforms?: {
      x: number;
      y: number;
      scale: number;
      rotation: number;
      opacity: number;
    };
    effects?: {
      filters: string[];
      speed: number;
      volume: number;
      fadeIn: number;
      fadeOut: number;
    };
  }>;
  textOverlays?: Array<{
    id: string;
    content: string;
    startMs: number;
    endMs: number;
    x: number;
    y: number;
    fontSize: number;
    fontFamily: string;
    color: string;
    backgroundColor?: string;
  }>;
  audioTracks?: Array<{
    localPath: string;
    startTime: number;
    endTime: number;
    volume: number;
  }>;
  settings: {
    width: number;
    height: number;
    fps: number;
  };
}

interface CreateExportJobInput {
  userId: string;
  projectId?: string | null; // Optional - allows exports without saved project
  timelineData: TimelineData;
  format?: 'MP4' | 'WEBM' | 'MOV';
  resolution?: 'SD' | 'HD' | 'UHD';
  addWatermark?: boolean;
}

/**
 * Export service for handling video export jobs
 */
export const exportService = {
  /**
   * Create a new export job
   */
  async createJob(input: CreateExportJobInput) {
    const { userId, projectId, timelineData, format = 'MP4', resolution = 'HD', addWatermark = true } = input;

    // Check rate limit (max 3 pending jobs per user)
    const pendingJobs = await prisma.exportHistory.count({
      where: {
        userId,
        status: {
          in: ['QUEUED', 'PROCESSING'],
        },
      },
    });

    if (pendingJobs >= 3) {
      throw new Error('Too many pending export jobs. Please wait for current exports to complete.');
    }

    const job = await prisma.exportHistory.create({
      data: {
        userId,
        projectId: (projectId && projectId !== 'default' ? projectId : undefined) as any,
        format,
        resolution,
        status: 'QUEUED',
        timelineData: JSON.parse(JSON.stringify(timelineData)),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
    });

    // Start processing in background (don't await)
    this.processJob(job.id, addWatermark).catch(err => {
      logger.error({ err, jobId: job.id }, 'Export job failed');
    });

    return job;
  },

  /**
   * Get job status
   */
  async getJobStatus(jobId: string, userId: string) {
    const job = await prisma.exportHistory.findFirst({
      where: {
        id: jobId,
        userId,
      },
    });

    if (!job) {
      throw new Error('Export job not found');
    }

    return {
      id: job.id,
      status: job.status,
      progress: job.progress,
      errorMessage: job.errorMessage,
      localPath: job.localPath,
      downloadUrl: job.downloadUrl,
      urlExpiresAt: job.urlExpiresAt,
      completedAt: job.completedAt,
    };
  },

  /**
   * Process export job (runs in background)
   */
  async processJob(jobId: string, addWatermark: boolean) {
    await ensureDirectories();

    // Update status to processing
    await prisma.exportHistory.update({
      where: { id: jobId },
      data: {
        status: 'PROCESSING',
        startedAt: new Date(),
        attempts: { increment: 1 },
      },
    });

    try {
      const job = await prisma.exportHistory.findUnique({
        where: { id: jobId },
      });

      if (!job || !job.timelineData) {
        throw new Error('Job not found or missing timeline data');
      }

      const timelineData = job.timelineData as unknown as TimelineData;
      const tempFiles: string[] = [];
      const outputId = randomUUID();

      // Step 1: Trim and apply effects to each clip
      logger.info({ jobId }, 'Starting clip trimming and effects');
      for (let i = 0; i < timelineData.clips.length; i++) {
        const clip = timelineData.clips[i];
        if (!clip) continue;

        const trimmedPath = join(TEMP_DIR, `${outputId}_trimmed_${i}.mp4`);
        await ffmpegProcessor.trim({
          inputPath: clip.localPath,
          outputPath: trimmedPath,
          startTime: clip.startTime,
          endTime: clip.endTime,
        });

        // Apply transforms/effects if present
        const hasTransforms = clip.transforms && (
          clip.transforms.x !== 0 ||
          clip.transforms.y !== 0 ||
          clip.transforms.scale !== 1 ||
          clip.transforms.rotation !== 0 ||
          clip.transforms.opacity !== 1
        );
        const hasEffects = clip.effects && (
          clip.effects.speed !== 1 ||
          clip.effects.volume !== 1 ||
          clip.effects.fadeIn > 0 ||
          clip.effects.fadeOut > 0 ||
          (clip.effects.filters && clip.effects.filters.length > 0)
        );

        if (hasTransforms || hasEffects) {
          const effectsPath = join(TEMP_DIR, `${outputId}_effects_${i}.mp4`);
          const clipDurationMs = (clip.endTime - clip.startTime) * 1000;
          
          await ffmpegProcessor.applyEffects({
            inputPath: trimmedPath,
            outputPath: effectsPath,
            transforms: clip.transforms,
            effects: clip.effects,
            outputWidth: timelineData.settings.width,
            outputHeight: timelineData.settings.height,
            durationMs: clipDurationMs,
          });
          
          // Replace trimmed with effects version
          await unlink(trimmedPath);
          tempFiles.push(effectsPath);
        } else {
          tempFiles.push(trimmedPath);
        }

        // Update progress
        const progress = Math.round(((i + 1) / timelineData.clips.length) * 50);
        await prisma.exportHistory.update({
          where: { id: jobId },
          data: { progress },
        });
      }

      // Step 2: Concatenate clips
      logger.info({ jobId }, 'Starting concatenation');
      let outputPath = join(TEMP_DIR, `${outputId}_concat.mp4`);
      
      if (tempFiles.length > 1) {
        await ffmpegProcessor.concat({
          inputPaths: tempFiles,
          outputPath,
        });
      } else if (tempFiles.length === 1 && tempFiles[0]) {
        // Single clip - just copy
        outputPath = tempFiles[0];
      }

      await prisma.exportHistory.update({
        where: { id: jobId },
        data: { progress: 70 },
      });

      // Step 2.5: Apply text overlays if any
      if (timelineData.textOverlays && timelineData.textOverlays.length > 0) {
        logger.info({ jobId, textOverlayCount: timelineData.textOverlays.length }, 'Applying text overlays');
        
        // Build filter chain for all text overlays
        const drawtextFilters: string[] = [];
        
        for (const overlay of timelineData.textOverlays) {
          const escapedText = overlay.content.replace(/[:\\\\]/g, '\\$&').replace(/'/g, "\\'");
          const color = overlay.color.replace('#', '0x');
          
          // Each drawtext filter with enable condition for timing
          const startSec = overlay.startMs / 1000;
          const endSec = overlay.endMs / 1000;
          
          // Calculate position based on percentage (0-100) and center anchor
          // x = (width * x_pct / 100) - (text_w / 2) -> centers horizontally at x_pct
          // y = (height * y_pct / 100) - (text_h / 2) -> centers vertically at y_pct
          let filter = `drawtext=text='${escapedText}'`;
          filter += `:x=(w*${overlay.x}/100)-(text_w/2):y=(h*${overlay.y}/100)-(text_h/2)`;
          filter += `:fontsize=${overlay.fontSize}`;
          filter += `:fontcolor=${color}`;
          filter += `:enable='between(t\\,${startSec}\\,${endSec})'`;
          
          if (overlay.backgroundColor) {
            const bgColor = overlay.backgroundColor.replace('#', '0x');
            filter += `:box=1:boxcolor=${bgColor}@0.7:boxborderw=10`;
          }
          
          drawtextFilters.push(filter);
        }
        
        if (drawtextFilters.length > 0) {
          const textOverlayPath = join(TEMP_DIR, `${outputId}_text.mp4`);
          const filterChain = drawtextFilters.join(',');
          
          const { runFFmpeg, validateInputPath, validateOutputPath } = await import('./ffmpeg/index');
          
          const validInput = validateInputPath(outputPath);
          const validOutput = validateOutputPath(textOverlayPath);
          
          await runFFmpeg({
            args: [
              '-nostdin', '-hide_banner', '-loglevel', 'error',
              '-progress', 'pipe:1',
              '-i', validInput,
              '-vf', filterChain,
              '-c:v', 'libx264',
              '-c:a', 'copy',
              '-preset', 'fast',
              validOutput,
            ],
            tempDir: '',
            totalDurationMs: 120000,
            timeoutMs: 180000,
          });
          
          // Replace concat output with text overlay version
          if (outputPath !== tempFiles[0]) {
            await unlink(outputPath);
          }
          outputPath = textOverlayPath;
          tempFiles.push(textOverlayPath);
        }
      }

      await prisma.exportHistory.update({
        where: { id: jobId },
        data: { progress: 80 },
      });

      // Step 3: Add watermark (for free tier)
      let finalPath = join(EXPORTS_DIR, `${outputId}_final.mp4`);
      
      if (addWatermark) {
        logger.info({ jobId }, 'Adding watermark');
        await ffmpegProcessor.addWatermark({
          inputPath: outputPath,
          outputPath: finalPath,
        });
      } else {
        // No watermark - just copy to exports dir
        await copyFile(outputPath, finalPath);
      }

      await prisma.exportHistory.update({
        where: { id: jobId },
        data: { progress: 90 },
      });

      // Step 4: Cleanup temp files
      for (const tempFile of tempFiles) {
        try {
          await unlink(tempFile);
        } catch {
          // Ignore cleanup errors
        }
      }
      if (outputPath !== tempFiles[0]) {
        try {
          await unlink(outputPath);
        } catch {
          // Ignore cleanup errors
        }
      }

      // Mark as completed with download URL
      const downloadUrl = `/api/v1/export/${jobId}/download`;
      const urlExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      
      await prisma.exportHistory.update({
        where: { id: jobId },
        data: {
          status: 'COMPLETED',
          progress: 100,
          localPath: finalPath,
          downloadUrl,
          urlExpiresAt,
          completedAt: new Date(),
        },
      });

      logger.info({ jobId, outputPath: finalPath }, 'Export completed');
    } catch (err) {
      logger.error({ err, jobId }, 'Export processing failed');
      await prisma.exportHistory.update({
        where: { id: jobId },
        data: {
          status: 'FAILED',
          errorMessage: err instanceof Error ? err.message : 'Unknown error',
        },
      });
    }
  },

  /**
   * Cancel an export job
   * Delegates to the new cancelExportJob which handles BullMQ and cleanup
   */
  async cancelJob(jobId: string, userId: string) {
    const result = await cancelExportJob(jobId, userId);
    
    if (!result.success && result.status === 'NOT_FOUND') {
      throw new Error('Export job not found');
    }
    
    if (!result.success && result.status === 'ALREADY_COMPLETED') {
      throw new Error('Cannot cancel completed job');
    }
    
    return {
      success: result.success,
      previousStatus: result.status,
      message: result.message,
    };
  },

  /**
   * Get user's export history
   */
  async getHistory(userId: string, limit = 10) {
    return prisma.exportHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  },
};
