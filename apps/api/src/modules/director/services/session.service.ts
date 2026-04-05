/**
 * Director Session Service
 * Handles session lifecycle and settings
 */

import { logger } from '@/lib/logger';
import { directorRepo } from '../director.repo';
import { directorAnalysisReuseService } from './analysis-reuse.service';

export const directorSessionService = {
  /**
   * Create a new director session
   */
  async createSession(userId: string) {
    const session = await directorRepo.createSession(userId);
    logger.info({ sessionId: session.id, userId }, 'Director session created');
    return session;
  },

  /**
   * Get session with ownership check
   */
  async getSession(sessionId: string, userId: string) {
    // Repo handles scoping
    const session = await directorRepo.findSession(sessionId, userId);

    if (!session) {
      throw new Error('Session not found or not authorized');
    }

    if (
      session.analysisJob?.status === 'COMPLETED' &&
      session.analysisJob.candidates.length === 0 &&
      session.asset
    ) {
      const reusableCandidates = await directorAnalysisReuseService.getReusableCandidates(
        session.asset,
      );

      return {
        ...session,
        analysisJob: {
          ...session.analysisJob,
          candidates: reusableCandidates ?? [],
        },
      };
    }

    return session;
  },

  /**
   * Delete session with cleanup
   */
  async deleteSession(sessionId: string, userId: string) {
    // Check existence/authorization implicitly via delete count checking
    // But logically we should check first for 404 vs 403?
    // Repo deleteSession uses deleteMany with userId scope.

    // Check first to ensure valid request
    const exists = await directorRepo.exists(sessionId, userId);
    if (!exists) {
      throw new Error('Session not found');
    }

    // TODO: Trigger async cleanup of files if needed (s3 delete etc)

    const deleted = await directorRepo.deleteSession(sessionId, userId);

    logger.info({ sessionId, userId, deleted }, 'Director session deleted');
    return { deleted };
  },

  /**
   * Update subtitle style
   */
  async updateSubtitleStyle(
    sessionId: string,
    userId: string,
    updates: {
      fontToken?: string;
      textColorToken?: string;
      bgColorToken?: string;
      fontSize?: number;
      position?: string;
      animation?: string;
    },
  ) {
    const exists = await directorRepo.exists(sessionId, userId);
    if (!exists) {
      throw new Error('Session not found');
    }

    const style = await directorRepo.upsertSubtitleStyle(sessionId, updates);
    return style;
  },
};
