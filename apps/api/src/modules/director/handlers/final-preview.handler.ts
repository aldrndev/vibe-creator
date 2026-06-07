import type { Job } from 'bullmq';
import { logger } from '@/lib/logger';
import type { DirectorFinalPreviewJobData } from '../final-preview.queue';
import { directorFinalPreviewService } from '../services/final-preview.service';

export async function processFinalPreviewJob(job: Job<DirectorFinalPreviewJobData>): Promise<void> {
  const { sessionId, userId, previewFileName, options } = job.data;

  await job.updateProgress(10);

  try {
    await directorFinalPreviewService.renderFinalPreview(
      sessionId,
      userId,
      previewFileName,
      options,
    );
    await job.updateProgress(100);
  } catch (error) {
    logger.error({ error, sessionId, previewFileName }, 'Director final preview job failed');
    throw error;
  }
}
