import { cleanupOldLoops, getVideoDuration } from './loop.utils';
import { type CreateBoomerangInput, processBoomerang } from './processors/boomerang.processor';
import { type CreateGifInput, processGif } from './processors/gif.processor';
import { type CreateLoopInput, processLoop } from './processors/loop.processor';

/**
 * Loop service for creating looping videos
 * NOW REFACTORED: Facade delegrating to specialized processors.
 */
export const loopService = {
  createLoop(input: CreateLoopInput): Promise<string> {
    return processLoop(input);
  },

  createBoomerang(input: CreateBoomerangInput): Promise<string> {
    return processBoomerang(input);
  },

  createGif(input: CreateGifInput): Promise<string> {
    return processGif(input);
  },

  cleanupOldLoops(maxAgeMs: number = 3600000): Promise<void> {
    return cleanupOldLoops(maxAgeMs);
  },

  getVideoDuration(path: string): Promise<number> {
    return getVideoDuration(path);
  },
};
