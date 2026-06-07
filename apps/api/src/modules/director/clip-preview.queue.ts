import { Queue } from 'bullmq';
import { redisOptions } from '@/lib/redis';

export const DIRECTOR_CLIP_PREVIEW_QUEUE_NAME = 'director-clip-preview';

export interface DirectorClipPreviewJobData {
  type: 'CLIP_PREVIEW';
  sessionId: string;
  clipId: string;
  userId: string;
  sourceFilePath: string;
  previewFileName: string;
  previewFilePath: string;
  startMs: number;
  endMs: number;
}

type DirectorClipPreviewQueueInstance = Queue<DirectorClipPreviewJobData, unknown, string>;
type DirectorClipPreviewQueueFacade = Pick<
  DirectorClipPreviewQueueInstance,
  'add' | 'close' | 'getJob'
>;

let directorClipPreviewQueueInstance: DirectorClipPreviewQueueInstance | null = null;

function createDirectorClipPreviewQueue(): DirectorClipPreviewQueueInstance {
  return new Queue<DirectorClipPreviewJobData, unknown, string>(DIRECTOR_CLIP_PREVIEW_QUEUE_NAME, {
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
  });
}

function getDirectorClipPreviewQueue(): DirectorClipPreviewQueueInstance {
  directorClipPreviewQueueInstance ??= createDirectorClipPreviewQueue();
  return directorClipPreviewQueueInstance;
}

export const directorClipPreviewQueue: DirectorClipPreviewQueueFacade = {
  add: (...args: Parameters<DirectorClipPreviewQueueInstance['add']>) =>
    getDirectorClipPreviewQueue().add(...args),
  close: (...args: Parameters<DirectorClipPreviewQueueInstance['close']>) =>
    getDirectorClipPreviewQueue().close(...args),
  getJob: (...args: Parameters<DirectorClipPreviewQueueInstance['getJob']>) =>
    getDirectorClipPreviewQueue().getJob(...args),
};
