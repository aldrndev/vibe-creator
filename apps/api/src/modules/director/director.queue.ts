import { Queue } from 'bullmq';
import { redisOptions } from '@/lib/redis';

export const DIRECTOR_QUEUE_NAME = 'director-analysis';

export interface DirectorAnalysisJobData {
  type: 'ANALYSIS';
  sessionId: string;
  assetId: string;
  filePath: string;
  userId: string;
}

export interface DirectorTranscribeSessionJobData {
  type: 'TRANSCRIBE_SESSION';
  sessionId: string;
  userId: string;
  forceRefresh?: boolean;
}

export interface DirectorTranscribeClipJobData {
  type: 'TRANSCRIBE_CLIP';
  sessionId: string;
  selectedClipId: string;
  userId: string;
  forceRefresh?: boolean;
}

export type DirectorJobData =
  | DirectorAnalysisJobData
  | DirectorTranscribeSessionJobData
  | DirectorTranscribeClipJobData
  | DirectorExportJobData;

export interface DirectorExportJobData {
  type: 'EXPORT';
  sessionId: string;
  userId: string;
  options: {
    includeSubtitles?: boolean;
    normalizeAudio?: boolean;
    aspectRatio?: '9:16' | '16:9' | '1:1';
    quality?: '720p' | '1080p';
    refineSettings?: Record<
      string,
      {
        faceTracking?: boolean;
        removeSilence?: boolean;
        optimizeHook?: boolean;
        stabilize?: boolean;
      }
    >;
  };
}

export function buildDirectorQueueJobId(...parts: Array<string | number>): string {
  return parts
    .map((part) => String(part).trim())
    .filter(Boolean)
    .join('-')
    .replace(/[^a-zA-Z0-9_-]+/g, '-');
}

/**
 * Queue for Director Analysis Jobs
 * Worker implementation is separate (see director.worker.ts)
 */
export const directorQueue = new Queue<DirectorJobData, unknown, string>(DIRECTOR_QUEUE_NAME, {
  connection: redisOptions,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: {
      age: 24 * 3600, // 24h
      count: 100,
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // 7d
    },
  },
});
