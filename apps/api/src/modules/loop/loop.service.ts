import { cleanupOldLoops, getVideoDuration } from "./loop.utils";
import { processLoop, CreateLoopInput } from "./processors/loop.processor";
import {
  processBoomerang,
  CreateBoomerangInput,
} from "./processors/boomerang.processor";
import { processGif, CreateGifInput } from "./processors/gif.processor";

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
