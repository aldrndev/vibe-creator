import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { env } from '@/config/env';
import { spawn } from 'child_process';
import { join } from 'path';
import { existsSync } from 'fs';
import { mkdir, writeFile, stat } from 'fs/promises';
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
  if (url.includes('vimeo.com')) return 'vimeo';
  if (url.includes('reddit.com')) return 'reddit';
  return 'unknown';
}

// Check if URL is a direct video link
function isDirectVideoUrl(url: string): boolean {
  const videoExtensions = ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.m4v'];
  const urlLower = url.toLowerCase();
  return videoExtensions.some(ext => urlLower.includes(ext));
}

interface CreateDownloadJobInput {
  userId: string;
  sourceUrl: string;
}

interface CobaltResponse {
  status: 'error' | 'redirect' | 'tunnel' | 'picker';
  url?: string;
  urls?: string[];
  text?: string;
  picker?: Array<{ url: string; type: string }>;
}

/**
 * Download service using Cobalt API (primary) with yt-dlp fallback
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
      sourceUrl: job.sourceUrl,
      localPath: job.localPath,
      errorMessage: job.errorMessage,
      completedAt: job.completedAt,
    };
  },

  /**
   * Delete a download job and its file
   */
  async deleteJob(jobId: string, userId: string) {
    const job = await prisma.downloadJob.findFirst({
      where: {
        id: jobId,
        userId,
      },
    });

    if (!job) {
      throw new Error('Download job not found');
    }

    // Delete file if exists
    if (job.localPath && existsSync(job.localPath)) {
      const { unlink } = await import('fs/promises');
      try {
        await unlink(job.localPath);
        logger.info({ jobId, localPath: job.localPath }, 'Deleted download file');
      } catch (err) {
        logger.warn({ jobId, err }, 'Failed to delete download file');
      }
    }

    // Delete database record
    await prisma.downloadJob.delete({
      where: { id: jobId },
    });

    return { deleted: true };
  },

  /**
   * Process download job - try Cobalt first, then yt-dlp
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

      let result: { title: string; metadata: Record<string, unknown> };

      // Check if it's a direct video URL
      if (isDirectVideoUrl(job.sourceUrl)) {
        logger.info({ jobId, url: job.sourceUrl }, 'Downloading direct video URL');
        result = await this.downloadDirectUrl(job.sourceUrl, outputPath);
      } else if (env.COBALT_API_URL) {
        // Use self-hosted Cobalt API if configured
        try {
          logger.info({ jobId, url: job.sourceUrl, cobaltUrl: env.COBALT_API_URL }, 'Downloading with Cobalt API');
          result = await this.runCobalt(job.sourceUrl, outputPath);
        } catch (cobaltError) {
          // Fallback to yt-dlp if Cobalt fails
          logger.warn({ jobId, error: cobaltError instanceof Error ? cobaltError.message : 'Unknown' }, 'Cobalt failed, falling back to yt-dlp');
          result = await this.runYtDlp(job.sourceUrl, outputPath);
        }
      } else {
        // No Cobalt configured, use yt-dlp directly
        logger.info({ jobId, url: job.sourceUrl }, 'Downloading with yt-dlp');
        result = await this.runYtDlp(job.sourceUrl, outputPath);
      }

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
      
      // Delete the failed record - only successful downloads are kept
      await prisma.downloadJob.delete({
        where: { id: jobId },
      });
      
      logger.info({ jobId }, 'Deleted failed download job');
    }
  },

  /**
   * Download using Cobalt API
   */
  async runCobalt(url: string, outputPath: string): Promise<{ title: string; metadata: Record<string, unknown> }> {
    if (!env.COBALT_API_URL) {
      throw new Error('Cobalt API URL not configured');
    }
    
    logger.info({ cobaltUrl: env.COBALT_API_URL, videoUrl: url }, 'Calling Cobalt API');
    
    const response = await fetch(env.COBALT_API_URL, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        videoQuality: '1080',
        youtubeVideoCodec: 'h264',
        filenameStyle: 'basic',
        downloadMode: 'auto',
      }),
    });

    // Get response as text first to debug
    const responseText = await response.text();
    logger.info({ status: response.status, responseLength: responseText.length }, 'Cobalt API response');

    if (!response.ok) {
      throw new Error(`Cobalt API error: ${response.status} - ${responseText.slice(0, 200)}`);
    }

    if (!responseText) {
      throw new Error('Cobalt API returned empty response');
    }

    let data: CobaltResponse;
    try {
      data = JSON.parse(responseText) as CobaltResponse;
    } catch {
      throw new Error(`Cobalt API returned invalid JSON: ${responseText.slice(0, 200)}`);
    }

    if (data.status === 'error') {
      throw new Error(data.text || 'Cobalt API error');
    }

    // Get the download URL
    let downloadUrl: string | undefined;
    
    if (data.status === 'redirect' || data.status === 'tunnel') {
      downloadUrl = data.url;
    } else if (data.status === 'picker' && data.picker && data.picker.length > 0) {
      // If multiple options, pick video
      const video = data.picker.find(p => p.type === 'video') ?? data.picker[0];
      if (video) {
        downloadUrl = video.url;
      }
    }

    if (!downloadUrl) {
      throw new Error('No download URL from Cobalt');
    }

    logger.info({ downloadUrl }, 'Downloading file from Cobalt URL');

    // Download the file
    const fileResponse = await fetch(downloadUrl);
    if (!fileResponse.ok) {
      throw new Error(`Failed to download file from Cobalt: ${fileResponse.status}`);
    }

    // Use arrayBuffer for reliable download (Readable.fromWeb can fail silently)
    const arrayBuffer = await fileResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    if (buffer.length === 0) {
      throw new Error('Downloaded file is empty (0 bytes)');
    }
    
    logger.info({ size: buffer.length }, 'Downloaded file buffer size');
    
    // Write to file
    await writeFile(outputPath, buffer);
    
    // Verify file was written correctly
    const fileStats = await stat(outputPath);
    if (fileStats.size === 0) {
      throw new Error('File written but size is 0 bytes');
    }
    
    logger.info({ outputPath, fileSize: fileStats.size }, 'File saved successfully');

    // Extract title from URL or use default
    const urlParts = url.split('/');
    const title = urlParts[urlParts.length - 1] || 'Downloaded Video';

    return {
      title: title.replace(/[?#].*$/, ''), // Remove query params
      metadata: { source: 'cobalt', size: fileStats.size },
    };
  },

  /**
   * Download direct video URL
   */
  async downloadDirectUrl(url: string, outputPath: string): Promise<{ title: string; metadata: Record<string, unknown> }> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download direct URL: ${response.status}`);
    }

    // Use arrayBuffer for reliable download
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    if (buffer.length === 0) {
      throw new Error('Downloaded file is empty (0 bytes)');
    }
    
    await writeFile(outputPath, buffer);
    
    // Verify
    const fileStats = await stat(outputPath);
    if (fileStats.size === 0) {
      throw new Error('File written but size is 0 bytes');
    }

    const urlParts = url.split('/');
    const filename = urlParts[urlParts.length - 1] || 'Downloaded Video';

    return {
      title: filename.replace(/[?#].*$/, ''),
      metadata: { source: 'direct', size: fileStats.size },
    };
  },

  /**
   * Run yt-dlp command (fallback)
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
          metadata = { duration: lines[1] || '0', source: 'yt-dlp' };
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
