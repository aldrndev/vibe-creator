/**
 * Director Session Service
 * Handles session lifecycle and settings
 */

import { logger } from '@/lib/logger';
import { directorRepo } from '../director.repo';
import { directorAnalysisReuseService } from './analysis-reuse.service';

const DEFAULT_MAX_CLIP_DURATION_MS = 60000;
const DIALOG_COMPLETION_EXTENSION_MS = 30000;
const ABSOLUTE_MAX_SHORT_DURATION_MS = 90000;

function resolveMaxClipDurationMs(config: unknown): number {
  if (typeof config !== 'object' || config === null || Array.isArray(config)) {
    return DEFAULT_MAX_CLIP_DURATION_MS;
  }

  const maxClipDuration = (config as Record<string, unknown>).maxClipDuration;
  if (
    typeof maxClipDuration !== 'number' ||
    !Number.isFinite(maxClipDuration) ||
    maxClipDuration <= 0
  ) {
    return DEFAULT_MAX_CLIP_DURATION_MS;
  }

  return maxClipDuration;
}

function filterCandidatesByMaxDuration<T extends { startMs: number; endMs: number }>(
  candidates: T[],
  maxDurationMs: number,
): T[] {
  return candidates.filter((candidate) => candidate.endMs - candidate.startMs <= maxDurationMs);
}

function removeOverlappingCandidates<T extends { startMs: number; endMs: number; rank?: number }>(
  candidates: T[],
): T[] {
  const selected: T[] = [];
  const sortedByRank = [...candidates].sort(
    (left, right) => (left.rank ?? 9999) - (right.rank ?? 9999),
  );

  for (const candidate of sortedByRank) {
    const hasOverlap = selected.some((existing) => {
      const overlapMs =
        Math.min(existing.endMs, candidate.endMs) - Math.max(existing.startMs, candidate.startMs);
      return overlapMs > 350;
    });

    if (!hasOverlap) {
      selected.push(candidate);
    }
  }

  return selected.sort((left, right) => (left.rank ?? 9999) - (right.rank ?? 9999));
}

function resolveHardMaxDurationMs(config: unknown): number {
  const baseMaxDurationMs = resolveMaxClipDurationMs(config);
  return Math.min(
    ABSOLUTE_MAX_SHORT_DURATION_MS,
    baseMaxDurationMs + DIALOG_COMPLETION_EXTENSION_MS,
  );
}

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
      const hardMaxDurationMs = resolveHardMaxDurationMs(session.analysisJob.config);
      const reusableCandidates = await directorAnalysisReuseService.getReusableCandidates(
        session.asset,
      );

      return {
        ...session,
        analysisJob: {
          ...session.analysisJob,
          candidates: removeOverlappingCandidates(
            filterCandidatesByMaxDuration(reusableCandidates ?? [], hardMaxDurationMs),
          ),
        },
      };
    }

    if (session.analysisJob?.candidates.length) {
      const hardMaxDurationMs = resolveHardMaxDurationMs(session.analysisJob.config);
      return {
        ...session,
        analysisJob: {
          ...session.analysisJob,
          candidates: removeOverlappingCandidates(
            filterCandidatesByMaxDuration(session.analysisJob.candidates, hardMaxDurationMs),
          ),
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
