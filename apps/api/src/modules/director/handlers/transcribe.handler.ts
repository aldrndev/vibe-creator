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
  buildDirectorQueueJobId,
  type DirectorTranscribeClipJobData,
  type DirectorTranscribeSessionJobData,
  directorQueue,
} from '../director.queue';
import {
  parseTranscribeProgressMeta,
  toTranscribeProgressJson,
  updateTranscribeProgressMeta,
} from '../services/transcribe-progress';

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

  if (!session?.transcribeJob) {
    throw new Error('Session or transcribe job not found');
  }

  await prisma.directorTranscribeJob.update({
    where: { id: session.transcribeJob.id },
    data: {
      status: 'PROCESSING',
      startedAt: session.transcribeJob.startedAt ?? new Date(),
      segments: toTranscribeProgressJson(
        updateTranscribeProgressMeta(parseTranscribeProgressMeta(session.transcribeJob.segments), {
          phase: 'queueing-clips',
        }),
      ),
    },
  });

  const clipJobs = session.selectedClips.map((clip: (typeof session.selectedClips)[number]) => {
    const jobData: DirectorTranscribeClipJobData = {
      type: 'TRANSCRIBE_CLIP',
      sessionId,
      selectedClipId: clip.id,
      userId: job.data.userId,
      forceRefresh: job.data.forceRefresh === true,
      language: job.data.language,
      subtitleMode: job.data.subtitleMode,
      subtitleTargetLanguage: job.data.subtitleTargetLanguage ?? null,
    };

    return {
      name: 'transcribe_clip' as const,
      data: jobData,
      opts: {
        removeOnComplete: true,
        jobId: buildDirectorQueueJobId('director', 'transcribe', 'clip', clip.id),
      },
    };
  });

  await directorQueue.addBulk(clipJobs);

  logger.info({ sessionId, count: clipJobs.length }, 'Queued clip transcription jobs');
}

/**
 * Fetches the cache-hit count for a session.
 */
async function fetchCacheHitCount(sessionId: string): Promise<number> {
  return prisma.directorClipTranscript.count({
    where: {
      sessionId,
      engine: 'WHISPER_CACHE',
      status: 'COMPLETED',
    },
  });
}

/**
 * Marks the transcribe job as completed or failed when all clips are settled.
 */
async function finalizeTranscribeJob(
  sessionId: string,
  settledTranscripts: number,
  failedTranscripts: number,
): Promise<void> {
  const session = await prisma.directorSession.findUnique({
    where: { id: sessionId },
    include: { transcribeJob: true },
  });

  if (!session?.transcribeJob) return;

  const cacheHitCount = await fetchCacheHitCount(sessionId);
  const phase = failedTranscripts > 0 ? 'failed' : 'completed';
  const progressMeta = updateTranscribeProgressMeta(
    parseTranscribeProgressMeta(session.transcribeJob.segments),
    {
      phase,
      completedClipCount: settledTranscripts - failedTranscripts,
      failedClipCount: failedTranscripts,
      cacheHitCount,
      currentClipId: null,
    },
  );

  const baseData = {
    completedAt: new Date(),
    segments: toTranscribeProgressJson(progressMeta),
  };

  await prisma.directorTranscribeJob.update({
    where: { id: session.transcribeJob.id },
    data:
      failedTranscripts > 0
        ? {
            ...baseData,
            status: 'FAILED' as const,
            errorMessage: `${failedTranscripts} klip gagal ditranskripsi.`,
          }
        : { ...baseData, status: 'COMPLETED' as const, errorMessage: null },
  });

  logger.info(
    { sessionId, failedTranscripts, settledTranscripts },
    'All clip transcription jobs settled',
  );
}

/**
 * Updates progress metadata while clips are still being processed.
 */
async function updateInProgressMeta(
  sessionId: string,
  settledTranscripts: number,
  failedTranscripts: number,
): Promise<void> {
  const session = await prisma.directorSession.findUnique({
    where: { id: sessionId },
    include: { transcribeJob: true },
  });

  if (!session?.transcribeJob) return;

  const cacheHitCount = await fetchCacheHitCount(sessionId);
  const progressMeta = updateTranscribeProgressMeta(
    parseTranscribeProgressMeta(session.transcribeJob.segments),
    {
      phase: 'processing-clips',
      completedClipCount: settledTranscripts - failedTranscripts,
      failedClipCount: failedTranscripts,
      cacheHitCount,
      currentClipId: null,
    },
  );

  await prisma.directorTranscribeJob.update({
    where: { id: session.transcribeJob.id },
    data: { segments: toTranscribeProgressJson(progressMeta) },
  });
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

  await transcribeService.transcribeSelectedClip(selectedClipId, {
    bypassCache: job.data.forceRefresh === true,
    language: job.data.language,
    subtitleMode: job.data.subtitleMode,
    subtitleTargetLanguage: job.data.subtitleTargetLanguage ?? null,
  });

  const clip = await prisma.directorSelectedClip.findUnique({
    where: { id: selectedClipId },
    select: { sessionId: true },
  });

  if (!clip) return;

  const { sessionId } = clip;
  const totalClips = await prisma.directorSelectedClip.count({
    where: { sessionId },
  });
  const settledTranscripts = await prisma.directorClipTranscript.count({
    where: {
      sessionId,
      status: { in: ['COMPLETED', 'FAILED'] },
    },
  });
  const failedTranscripts = await prisma.directorClipTranscript.count({
    where: {
      sessionId,
      status: 'FAILED',
    },
  });

  if (settledTranscripts >= totalClips) {
    await finalizeTranscribeJob(sessionId, settledTranscripts, failedTranscripts);
  } else {
    await updateInProgressMeta(sessionId, settledTranscripts, failedTranscripts);
  }
}
