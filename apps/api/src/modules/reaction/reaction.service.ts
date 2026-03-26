import { type CreateReactionInput, processReaction } from './processors/pip.processor';
import { type CreateSideBySideInput, processSideBySide } from './processors/sidebyside.processor';
import { cleanupOldReactions } from './reaction.utils';

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
