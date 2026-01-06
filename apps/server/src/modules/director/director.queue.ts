import { Queue } from "bullmq";
import { redis } from "@/lib/redis";

export const DIRECTOR_QUEUE_NAME = "director-analysis";

export interface DirectorAnalysisJobData {
  type: "ANALYSIS";
  sessionId: string;
  assetId: string;
  filePath: string;
  userId: string;
}

export interface DirectorTranscribeSessionJobData {
  type: "TRANSCRIBE_SESSION";
  sessionId: string;
  userId: string;
}

export interface DirectorTranscribeClipJobData {
  type: "TRANSCRIBE_CLIP";
  sessionId: string;
  selectedClipId: string;
  userId: string;
}

export type DirectorJobData =
  | DirectorAnalysisJobData
  | DirectorTranscribeSessionJobData
  | DirectorTranscribeClipJobData
  | DirectorExportJobData;

export interface DirectorExportJobData {
  type: "EXPORT";
  sessionId: string;
  userId: string;
  options: {
    includeSubtitles?: boolean;
    aspectRatio?: "9:16" | "16:9" | "1:1";
    quality?: "720p" | "1080p";
  };
}

/**
 * Queue for Director Analysis Jobs
 * Worker implementation is separate (see director.worker.ts)
 */
export const directorQueue = new Queue<DirectorJobData>(DIRECTOR_QUEUE_NAME, {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
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
