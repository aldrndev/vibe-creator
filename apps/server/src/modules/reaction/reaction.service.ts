import { cleanupOldReactions } from "./reaction.utils";
import {
  processReaction,
  CreateReactionInput,
} from "./processors/pip.processor";
import {
  processSideBySide,
  CreateSideBySideInput,
} from "./processors/sidebyside.processor";

/**
 * Reaction service for creating picture-in-picture and side-by-side videos.
 * NOW REFACTORED: Facade delegrating to specialized processors.
 */
export const reactionService = {
  createReaction(input: CreateReactionInput): Promise<string> {
    return processReaction(input);
  },

  createReactionMixedAudio(input: CreateReactionInput): Promise<string> {
    return processReaction(input);
  },

  createSideBySide(input: CreateSideBySideInput): Promise<string> {
    return processSideBySide(input);
  },

  cleanupOldReactions(maxAgeMs: number): Promise<void> {
    return cleanupOldReactions(maxAgeMs);
  },
};
