/**
 * Director Session Service
 * Handles session lifecycle and settings
 */

import type { Prisma } from '@prisma/client';
import { logger } from '@/lib/logger';
import { assertWorkspaceActive } from '@/modules/workspace/workspace-lifecycle';
import {
  preferCandidatesWithinTargetDurationRange,
  resolveClipDurationConfig,
  resolveHardMaxCandidateDurationMs,
} from '../analysis-duration-config';
import { directorRepo } from '../director.repo';
import { directorAnalysisReuseService } from './analysis-reuse.service';

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

    assertWorkspaceActive(
      session.lifecycleStatus,
      session.expiresAt,
      'Sesi AI Director sudah expired. Mulai sesi baru atau cek Riwayat.',
    );
    await directorRepo.markSessionOpened(sessionId, userId);

    if (
      session.analysisJob?.status === 'COMPLETED' &&
      session.analysisJob.candidates.length === 0 &&
      session.asset
    ) {
      const resolvedConfig = resolveClipDurationConfig(session.analysisJob.config);
      const hardMaxDurationMs = resolveHardMaxCandidateDurationMs(resolvedConfig.maxClipDurationMs);
      const reusableCandidates = await directorAnalysisReuseService.getReusableCandidates(
        session.asset,
        resolvedConfig.targetDurationRange,
      );
      const filteredCandidates = preferCandidatesWithinTargetDurationRange(
        removeOverlappingCandidates(
          filterCandidatesByMaxDuration(reusableCandidates ?? [], hardMaxDurationMs),
        ),
        resolvedConfig.targetDurationRange,
      );

      return {
        ...session,
        analysisJob: {
          ...session.analysisJob,
          candidates: filteredCandidates.candidates,
        },
      };
    }

    if (session.analysisJob?.candidates.length) {
      const resolvedConfig = resolveClipDurationConfig(session.analysisJob.config);
      const hardMaxDurationMs = resolveHardMaxCandidateDurationMs(resolvedConfig.maxClipDurationMs);
      const filteredCandidates = preferCandidatesWithinTargetDurationRange(
        removeOverlappingCandidates(
          filterCandidatesByMaxDuration(session.analysisJob.candidates, hardMaxDurationMs),
        ),
        resolvedConfig.targetDurationRange,
      );
      return {
        ...session,
        analysisJob: {
          ...session.analysisJob,
          candidates: filteredCandidates.candidates,
        },
      };
    }

    return session;
  },

  /**
   * Delete session with cleanup
   */
  async deleteSession(sessionId: string, userId: string) {
    const session = await directorRepo.findSession(sessionId, userId);
    if (!session) {
      throw new Error('Session not found');
    }

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
      stylePreset?: string;
      fontToken?: string;
      fontFamily?: string;
      textColorToken?: string;
      bgColorToken?: string;
      fontSize?: number;
      position?: string;
      animation?: string;
      speakerMode?: string;
      speakerStyles?: Prisma.InputJsonValue;
    },
  ) {
    const exists = await directorRepo.exists(sessionId, userId);
    if (!exists) {
      throw new Error('Session not found');
    }

    const session = await directorRepo.findSession(sessionId, userId);
    if (!session) {
      throw new Error('Session not found');
    }
    assertWorkspaceActive(session.lifecycleStatus, session.expiresAt);

    const style = await directorRepo.upsertSubtitleStyle(sessionId, updates);
    await directorRepo.touchSessionActivity(sessionId, userId);
    return style;
  },
};
