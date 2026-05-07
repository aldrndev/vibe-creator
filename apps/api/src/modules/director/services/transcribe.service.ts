/**
 * Director Transcribe Service
 * Handles transcription jobs
 */

import { DirectorJobStatus, type Prisma } from '@prisma/client';
import { env } from '@/config/env';
import { logger } from '@/lib/logger';
import { redis } from '@/lib/redis';
import {
  DEFAULT_TRANSCRIBE_LANGUAGE,
  isAutoTranscribeLanguage,
  normalizeTranscribeLanguage,
  type TranscribeLanguage,
} from '@/modules/transcribe/transcribe-language';
import { buildDirectorQueueJobId, directorQueue } from '../director.queue';
import { directorRepo } from '../director.repo';
import {
  buildInitialTranscribeProgressMeta,
  parseTranscribeProgressMeta,
  toTranscribeProgressJson,
} from './transcribe-progress';

type TranscribeJob = NonNullable<Awaited<ReturnType<typeof directorRepo.createTranscribeJob>>>;
export interface StartTranscribeOptions {
  forceRefresh?: boolean;
  language?: TranscribeLanguage;
  subtitleMode?: 'original' | 'translate';
  subtitleTargetLanguage?: TranscribeLanguage;
}

export interface TranscriptUpdateWord {
  startMs: number;
  endMs: number;
  text: string;
  confidence?: number;
  speaker?: string;
}

export interface TranscriptUpdateSegment {
  startMs: number;
  endMs: number;
  text: string;
  speaker?: string;
  words?: TranscriptUpdateWord[];
}

function toTranscriptJsonSegments(segments: TranscriptUpdateSegment[]): Prisma.InputJsonValue[] {
  return segments.map((segment) => ({
    startMs: segment.startMs,
    endMs: segment.endMs,
    text: segment.text,
    ...(segment.speaker ? { speaker: segment.speaker } : {}),
    ...(segment.words
      ? {
          words: segment.words.map((word) => ({
            startMs: word.startMs,
            endMs: word.endMs,
            text: word.text,
            ...(word.confidence !== undefined ? { confidence: word.confidence } : {}),
            ...(word.speaker ? { speaker: word.speaker } : {}),
          })),
        }
      : {}),
  }));
}

/**
 * Resolves the effective transcribe language from options and session state.
 */
function resolveRequestedLanguage(
  session: Awaited<ReturnType<typeof directorRepo.findSession>>,
  optionsLanguage: TranscribeLanguage | undefined,
): TranscribeLanguage {
  if (session) {
    return normalizeTranscribeLanguage(
      optionsLanguage ?? session.transcribeJob?.language ?? env.TRANSCRIBE_LANGUAGE,
      env.TRANSCRIBE_LANGUAGE,
    );
  }
  return normalizeTranscribeLanguage(optionsLanguage, DEFAULT_TRANSCRIBE_LANGUAGE);
}

export const directorTranscribeService = {
  /**
   * Start transcription job
   */
  async startTranscribe(sessionId: string, userId: string, options: StartTranscribeOptions = {}) {
    const session = await directorRepo.findSession(sessionId, userId);
    const forceRefresh = options.forceRefresh === true;
    const existingProgressMeta = parseTranscribeProgressMeta(session?.transcribeJob?.segments);
    const requestedLanguage = resolveRequestedLanguage(session, options.language);
    const requestedSubtitleMode =
      options.subtitleMode ?? existingProgressMeta?.subtitleMode ?? 'original';
    const requestedSubtitleTargetLanguage =
      requestedSubtitleMode === 'translate'
        ? normalizeTranscribeLanguage(
            options.subtitleTargetLanguage ?? existingProgressMeta?.subtitleTargetLanguage ?? 'en',
            'en',
          )
        : null;

    if (!session) {
      throw new Error('Session not found');
    }

    if (
      requestedSubtitleMode === 'translate' &&
      isAutoTranscribeLanguage(requestedSubtitleTargetLanguage)
    ) {
      throw new Error('Bahasa target terjemahan harus spesifik (contoh: "en", "es", "ja").');
    }

    if (session.selectedClips.length === 0) {
      throw new Error('No clips selected');
    }

    if (redis.status !== 'ready') {
      throw new Error('Transcription queue belum siap. Pastikan Redis aktif lalu coba lagi.');
    }

    const clipDurationTotalMs = session.selectedClips.reduce(
      (total, clip) => total + Math.max(0, clip.candidate.endMs - clip.candidate.startMs),
      0,
    );
    const progressMeta = buildInitialTranscribeProgressMeta({
      clipCount: session.selectedClips.length,
      clipDurationTotalMs,
      subtitleMode: requestedSubtitleMode,
      subtitleTargetLanguage: requestedSubtitleTargetLanguage,
    });

    let job: TranscribeJob;

    // Check existing job
    if (session.transcribeJob) {
      const status = session.transcribeJob.status;
      const isActiveStatus =
        status === DirectorJobStatus.PENDING || status === DirectorJobStatus.PROCESSING;

      // If active or completed, return existing
      if (isActiveStatus || (!forceRefresh && status === DirectorJobStatus.COMPLETED)) {
        const activeJobLanguage = normalizeTranscribeLanguage(
          session.transcribeJob.language,
          requestedLanguage,
        );

        if (activeJobLanguage !== requestedLanguage) {
          throw new Error(
            'Bahasa transkripsi berbeda dari job aktif. Jalankan transkripsi ulang setelah job saat ini selesai.',
          );
        }

        return {
          ...session.transcribeJob,
          language: requestedLanguage,
          subtitleMode: requestedSubtitleMode,
          subtitleTargetLanguage: requestedSubtitleTargetLanguage,
        };
      }

      // Force refresh or retry failed job by resetting state.
      if (status === DirectorJobStatus.FAILED || forceRefresh) {
        logger.info(
          { sessionId, jobId: session.transcribeJob.id, forceRefresh },
          'Resetting transcribe job for retry',
        );
        job = await directorRepo.updateTranscribeJob(session.transcribeJob.id, {
          status: DirectorJobStatus.PENDING,
          errorMessage: null,
          startedAt: null,
          completedAt: null,
          language: requestedLanguage,
          segments: toTranscribeProgressJson(progressMeta),
        });
      } else {
        // Should not happen, but safe fallback
        job = {
          ...session.transcribeJob,
          language: requestedLanguage,
        };
      }
    } else {
      // Create new job if none exists
      const idempotencyKey = `${sessionId}:transcribe:${Date.now()}`;
      job = await directorRepo.createTranscribeJob({
        sessionId,
        idempotencyKey,
        status: DirectorJobStatus.PENDING,
        engine: 'WHISPER_LOCAL',
        language: requestedLanguage,
        segments: toTranscribeProgressJson(progressMeta),
      });
    }

    // Queue BullMQ job
    const queueJobId = buildDirectorQueueJobId('director', 'transcribe', job.id, Date.now());

    await directorQueue.add(
      'transcribe_session',
      {
        type: 'TRANSCRIBE_SESSION',
        sessionId,
        userId,
        forceRefresh,
        language: requestedLanguage,
        subtitleMode: requestedSubtitleMode,
        subtitleTargetLanguage: requestedSubtitleTargetLanguage,
      },
      {
        jobId: queueJobId,
        removeOnComplete: true,
      },
    );

    logger.info(
      {
        sessionId,
        jobId: job.id,
        queueJobId,
        language: requestedLanguage,
        subtitleMode: requestedSubtitleMode,
        subtitleTargetLanguage: requestedSubtitleTargetLanguage,
      },
      'Director transcribe job created and queued',
    );

    return {
      ...job,
      language: requestedLanguage,
      subtitleMode: requestedSubtitleMode,
      subtitleTargetLanguage: requestedSubtitleTargetLanguage,
    };
  },

  /**
   * Get transcription result
   */
  async getTranscribeResult(sessionId: string, userId: string) {
    const session = await directorRepo.findSession(sessionId, userId);

    if (!session) {
      throw new Error('Session not found');
    }

    if (!session.transcribeJob) {
      return null;
    }

    return {
      ...session.transcribeJob,
      progressMeta: parseTranscribeProgressMeta(session.transcribeJob.segments),
    };
  },

  /**
   * Update clip transcript
   */
  async updateClipTranscript(
    sessionId: string,
    userId: string,
    clipId: string,
    segments: TranscriptUpdateSegment[],
  ) {
    const exists = await directorRepo.exists(sessionId, userId);

    if (!exists) {
      throw new Error('Session not found');
    }

    return directorRepo.updateClipTranscript(clipId, sessionId, toTranscriptJsonSegments(segments));
  },
};
