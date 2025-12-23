import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { spawn } from 'child_process';
import { join } from 'path';
import { existsSync } from 'fs';
import { mkdir } from 'fs/promises';
import { randomUUID } from 'crypto';

const DOWNLOADS_DIR = join(process.cwd(), 'uploads', 'downloads');

// Ensure downloads directory exists
async function ensureDownloadsDir() {
  if (!existsSync(DOWNLOADS_DIR)) {
    await mkdir(DOWNLOADS_DIR, { recursive: true });
  }
}

// Detect platform from URL
function detectPlatform(url: string): string {
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  if (url.includes('tiktok.com')) return 'tiktok';
  if (url.includes('instagram.com')) return 'instagram';
  if (url.includes('twitter.com') || url.includes('x.com')) return 'twitter';
  if (url.includes('facebook.com') || url.includes('fb.watch')) return 'facebook';
  return 'unknown';
}

interface CreateDownloadJobInput {
  userId: string;
  sourceUrl: string;
}

/**
 * Download service for yt-dlp video downloads
 */
export const downloadService = {
  /**
   * Create a new download job
   */
  async createJob(input: CreateDownloadJobInput) {
    const { userId, sourceUrl } = input;

    // Check rate limit (max 5 pending downloads per user)
    const pendingJobs = await prisma.downloadJob.count({
      where: {
        userId,
        status: {
          in: ['PENDING', 'DOWNLOADING'],
        },
      },
    });

    if (pendingJobs >= 5) {
      throw new Error('Too many pending downloads. Please wait for current downloads to complete.');
    }

    const platform = detectPlatform(sourceUrl);

    const job = await prisma.downloadJob.create({
      data: {
        userId,
        sourceUrl,
        platform,
        status: 'PENDING',
      },
    });

    // Start processing in background
    this.processJob(job.id).catch(err => {
      logger.error({ err, jobId: job.id }, 'Download job failed');
    });

    return job;
  },

  /**
   * Get job status
   */
  async getJobStatus(jobId: string, userId: string) {
    const job = await prisma.downloadJob.findFirst({
      where: {
        id: jobId,
        userId,
      },
    });

    if (!job) {
      throw new Error('Download job not found');
    }

    return {
      id: job.id,
      status: job.status,
      platform: job.platform,
      title: job.title,
      localPath: job.localPath,
      errorMessage: job.errorMessage,
      completedAt: job.completedAt,
    };
  },

  /**
   * Process download job using yt-dlp
   */
  async processJob(jobId: string) {
    await ensureDownloadsDir();

    // Update status to downloading
    await prisma.downloadJob.update({
      where: { id: jobId },
      data: { status: 'DOWNLOADING' },
    });

    try {
      const job = await prisma.downloadJob.findUnique({
        where: { id: jobId },
      });

      if (!job) {
        throw new Error('Job not found');
      }

      const outputId = randomUUID();
      const outputPath = join(DOWNLOADS_DIR, `${outputId}.mp4`);

      // Run yt-dlp
      const result = await this.runYtDlp(job.sourceUrl, outputPath);

      // Mark as completed
      await prisma.downloadJob.update({
        where: { id: jobId },
        data: {
          status: 'COMPLETED',
          title: result.title,
          localPath: outputPath,
          metadata: result.metadata as Record<string, string>,
          completedAt: new Date(),
        },
      });

      logger.info({ jobId, output: outputPath }, 'Download completed');
    } catch (err) {
      logger.error({ err, jobId }, 'Download processing failed');
      await prisma.downloadJob.update({
        where: { id: jobId },
        data: {
          status: 'FAILED',
          errorMessage: err instanceof Error ? err.message : 'Unknown error',
        },
      });
    }
  },

  /**
   * Run yt-dlp command
   */
  async runYtDlp(url: string, outputPath: string): Promise<{ title: string; metadata: Record<string, unknown> }> {
    return new Promise((resolve, reject) => {
      let title = 'Downloaded Video';
      let metadata: Record<string, unknown> = {};

      // First get video info with bypass options
      const infoProcess = spawn('yt-dlp', [
        '--print', '%(title)s',
        '--print', '%(duration)s',
        '--skip-download',
        '--no-check-certificates',
        '--extractor-args', 'youtube:player_client=android',
        url,
      ]);

      let infoOutput = '';
      infoProcess.stdout.on('data', (data) => {
        infoOutput += data.toString();
      });

      infoProcess.on('close', (infoCode) => {
        if (infoCode === 0) {
          const lines = infoOutput.trim().split('\n');
          title = lines[0] || 'Downloaded Video';
          metadata = { duration: lines[1] || '0' };
        }

        // Then download with bypass options
        const downloadProcess = spawn('yt-dlp', [
          '-f', 'best[ext=mp4]/best',
          '--no-check-certificates',
          '--no-playlist',
          '--extractor-args', 'youtube:player_client=android',
          '-o', outputPath,
          url,
        ]);

        let errorOutput = '';
        downloadProcess.stderr.on('data', (data) => {
          errorOutput += data.toString();
          logger.debug({ data: data.toString() }, 'yt-dlp stderr');
        });

        downloadProcess.stdout.on('data', (data) => {
          logger.debug({ data: data.toString() }, 'yt-dlp stdout');
        });

        downloadProcess.on('close', (code) => {
          if (code === 0) {
            resolve({ title, metadata });
          } else {
            reject(new Error(`yt-dlp failed with code ${code}: ${errorOutput}`));
          }
        });

        downloadProcess.on('error', () => {
          reject(new Error(`yt-dlp not found. Install with: brew install yt-dlp`));
        });
      });

      infoProcess.on('error', () => {
        // If info fails, try to download anyway
        const downloadProcess = spawn('yt-dlp', [
          '-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
          '--merge-output-format', 'mp4',
          '-o', outputPath,
          url,
        ]);

        downloadProcess.on('close', (code) => {
          if (code === 0) {
            resolve({ title, metadata });
          } else {
            reject(new Error('yt-dlp failed'));
          }
        });

        downloadProcess.on('error', () => {
          reject(new Error('yt-dlp not found. Install with: brew install yt-dlp'));
        });
      });
    });
  },

  /**
   * Get user's download history
   */
  async getHistory(userId: string, limit = 10) {
    return prisma.downloadJob.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  },
};
