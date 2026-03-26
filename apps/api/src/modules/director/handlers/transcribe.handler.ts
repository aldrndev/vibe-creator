/**
 * @module director/handlers/transcribe
 * @description BullMQ job handlers for AI Director transcription.
 *
 * Two job types:
 * - TRANSCRIBE_SESSION: Orchestrates transcription for all selected clips
 * - TRANSCRIBE_CLIP: Transcribes a single clip using Whisper API
 *
 * The session handler spawns individual clip jobs for parallel processing.
 */

import type { Job } from 'bullmq';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { transcribeService } from '../../transcribe/transcribe.service';
import {
  type DirectorTranscribeClipJobData,
  type DirectorTranscribeSessionJobData,
  directorQueue,
} from '../director.queue';

/**
 * Orchestrates transcription for all selected clips in a session.
 * Spawns individual TRANSCRIBE_CLIP jobs for parallel processing.
 *
 * @param job - BullMQ job containing session information
 * @throws Error if session or transcribe job not found
 */
export async function processTranscribeSessionJob(job: Job<DirectorTranscribeSessionJobData>) {
  const { sessionId } = job.data;
  logger.info({ sessionId }, 'Processing transcribe session job');

  const session = await prisma.directorSession.findUnique({
    where: { id: sessionId },
    include: { selectedClips: true, transcribeJob: true },
  });

  if (!session || !session.transcribeJob) {
    throw new Error('Session or transcribe job not found');
  }

  await prisma.directorTranscribeJob.update({
    where: { id: session.transcribeJob.id },
    data: { status: 'PROCESSING' },
  });

  const clipJobs = session.selectedClips.map((clip: (typeof session.selectedClips)[number]) => {
    const jobData: DirectorTranscribeClipJobData = {
      type: 'TRANSCRIBE_CLIP',
      sessionId,
      selectedClipId: clip.id,
      userId: job.data.userId,
    };

    return {
      name: 'transcribe_clip' as const,
      data: jobData,
      opts: {
        removeOnComplete: true,
        jobId: `director:transcribe:clip:${clip.id}`,
      },
    };
  });

  await directorQueue.addBulk(clipJobs);

  logger.info({ sessionId, count: clipJobs.length }, 'Queued clip transcription jobs');
}

/**
 * Transcribes a single selected clip using Whisper API.
 * Automatically marks parent job as COMPLETED when all clips are done.
 *
 * @param job - BullMQ job containing clip ID
 */

export async function processTranscribeClipJob(job: Job<DirectorTranscribeClipJobData>) {
  const { selectedClipId } = job.data;
  logger.info({ selectedClipId }, 'Processing transcribe clip job');

  await transcribeService.transcribeSelectedClip(selectedClipId);

  const clip = await prisma.directorSelectedClip.findUnique({
    where: { id: selectedClipId },
    select: { sessionId: true },
  });

  if (clip) {
    const { sessionId } = clip;
    const totalClips = await prisma.directorSelectedClip.count({
      where: { sessionId },
    });
    const completedTranscripts = await prisma.directorClipTranscript.count({
      where: {
        sessionId,
        status: { in: ['COMPLETED', 'FAILED'] },
      },
    });

    if (completedTranscripts >= totalClips) {
      const session = await prisma.directorSession.findUnique({
        where: { id: sessionId },
        include: { transcribeJob: true },
      });

      if (session?.transcribeJob) {
        await prisma.directorTranscribeJob.update({
          where: { id: session.transcribeJob.id },
          data: { status: 'COMPLETED' },
        });
        logger.info({ sessionId }, 'All clips transcribed - marked job COMPLETED');
      }
    }
  }
}
