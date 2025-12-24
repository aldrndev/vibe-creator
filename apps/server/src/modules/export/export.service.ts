import { prisma } from '@/lib/prisma';
import { ffmpegProcessor } from './ffmpeg.processor';
import { logger } from '@/lib/logger';
import { join } from 'path';
import { unlink, mkdir, copyFile } from 'fs/promises';
import { existsSync } from 'fs';
import { randomUUID } from 'crypto';

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
  }>;
  settings: {
    width: number;
    height: number;
    fps: number;
  };
}

interface CreateExportJobInput {
  userId: string;
  projectId: string;
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
        projectId,
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

      // Step 1: Trim each clip
      logger.info({ jobId }, 'Starting clip trimming');
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
        tempFiles.push(trimmedPath);

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
        data: { progress: 75 },
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

      // Mark as completed
      await prisma.exportHistory.update({
        where: { id: jobId },
        data: {
          status: 'COMPLETED',
          progress: 100,
          localPath: finalPath,
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
