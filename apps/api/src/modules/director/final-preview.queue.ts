import { Queue } from 'bullmq';
import { redisOptions } from '@/lib/redis';
import type { FinalPreviewOptionsInput } from './services/final-preview.service';

export const DIRECTOR_FINAL_PREVIEW_QUEUE_NAME = 'director-final-preview';

export interface DirectorFinalPreviewJobData {
  type: 'FINAL_PREVIEW';
  sessionId: string;
  userId: string;
  previewFileName: string;
  options: FinalPreviewOptionsInput;
}

type DirectorFinalPreviewQueueInstance = Queue<DirectorFinalPreviewJobData, unknown, string>;
type DirectorFinalPreviewQueueFacade = Pick<
  DirectorFinalPreviewQueueInstance,
  'add' | 'close' | 'getJob'
>;

let directorFinalPreviewQueueInstance: DirectorFinalPreviewQueueInstance | null = null;

export function buildDirectorFinalPreviewJobId(sessionId: string, previewFileName: string): string {
  return `director-final-preview:${sessionId}:${previewFileName}`;
}

function createDirectorFinalPreviewQueue(): DirectorFinalPreviewQueueInstance {
  return new Queue<DirectorFinalPreviewJobData, unknown, string>(
    DIRECTOR_FINAL_PREVIEW_QUEUE_NAME,
    {
      connection: redisOptions,
      defaultJobOptions: {
        attempts: 2,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: {
          age: 24 * 3600,
          count: 200,
        },
        removeOnFail: {
          age: 24 * 3600,
        },
      },
    },
  );
}

function getDirectorFinalPreviewQueue(): DirectorFinalPreviewQueueInstance {
  directorFinalPreviewQueueInstance ??= createDirectorFinalPreviewQueue();
  return directorFinalPreviewQueueInstance;
}

export const directorFinalPreviewQueue: DirectorFinalPreviewQueueFacade = {
  add: (...args: Parameters<DirectorFinalPreviewQueueInstance['add']>) =>
    getDirectorFinalPreviewQueue().add(...args),
  close: (...args: Parameters<DirectorFinalPreviewQueueInstance['close']>) =>
    getDirectorFinalPreviewQueue().close(...args),
  getJob: (...args: Parameters<DirectorFinalPreviewQueueInstance['getJob']>) =>
    getDirectorFinalPreviewQueue().getJob(...args),
};
