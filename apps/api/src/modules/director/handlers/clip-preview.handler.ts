import { access, mkdir, rename, unlink } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { Job } from 'bullmq';
import { logger } from '@/lib/logger';
import type { DirectorClipPreviewJobData } from '../clip-preview.queue';
import { directorProcessor } from '../director.processor';
import { runWithPreviewGenerationLock } from '../preview-generation-lock';

export async function processClipPreviewJob(job: Job<DirectorClipPreviewJobData>): Promise<void> {
  const { previewFilePath, previewFileName, sourceFilePath, startMs, endMs } = job.data;

  try {
    await access(previewFilePath);
    await job.updateProgress(100);
    return;
  } catch {
    // Generate when cache is missing.
  }

  await runWithPreviewGenerationLock(previewFilePath, async () => {
    try {
      await access(previewFilePath);
      await job.updateProgress(100);
      return;
    } catch {
      // Continue generation when still missing inside the lock.
    }

    await mkdir(dirname(previewFilePath), { recursive: true });

    const tempFileName = `${previewFileName}.tmp-${Date.now()}.mp4`;
    const tempFilePath = join(dirname(previewFilePath), tempFileName);

    try {
      await job.updateProgress(15);
      await directorProcessor.generateClipVideoPreview(
        sourceFilePath,
        dirname(previewFilePath),
        startMs,
        endMs,
        tempFileName,
      );
      await job.updateProgress(90);
      await rename(tempFilePath, previewFilePath);
      await job.updateProgress(100);
    } catch (error) {
      try {
        await unlink(tempFilePath);
      } catch {
        // Ignore temp cleanup errors.
      }

      logger.error(
        {
          error,
          previewFilePath,
          clipId: job.data.clipId,
          sessionId: job.data.sessionId,
        },
        'Director clip preview generation failed',
      );
      throw error;
    }
  });
}
