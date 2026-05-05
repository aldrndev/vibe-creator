/**
 * Director Analysis Service
 * Handles content analysis and clip selection
 */

import { basename, join } from 'node:path';
import { DirectorIngestStatus, DirectorJobStatus, DirectorStep, Prisma } from '@prisma/client';
import { env } from '@/config/env';
import { logger } from '@/lib/logger';
import {
  DEFAULT_MAX_CANDIDATES,
  isConfigCompatible,
  preferCandidatesWithinTargetDurationRange,
  resolveClipDurationConfig,
  resolveHardMaxCandidateDurationMs,
  resolveTargetDurationRangeConfig,
  type TargetDurationRange,
} from '../analysis-duration-config';
import { directorProcessor } from '../director.processor';
import { buildDirectorQueueJobId, directorQueue } from '../director.queue';
import { directorRepo } from '../director.repo';
import { directorAnalysisReuseService } from './analysis-reuse.service';

const MIN_SCENE_GAP_MS = 200;

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
      if (existing.endMs <= candidate.startMs) {
        return candidate.startMs - existing.endMs < MIN_SCENE_GAP_MS;
      }

      if (candidate.endMs <= existing.startMs) {
        return existing.startMs - candidate.endMs < MIN_SCENE_GAP_MS;
      }

      return true;
    });

    if (!hasOverlap) {
      selected.push(candidate);
    }
  }

  return selected.sort((left, right) => (left.rank ?? 9999) - (right.rank ?? 9999));
}

function normalizeCandidateMetadata(metadata: unknown): Prisma.InputJsonValue {
  if (typeof metadata !== 'object' || metadata === null || Array.isArray(metadata)) {
    return {};
  }

  return metadata as Prisma.InputJsonValue;
}

function toPersistedCandidateInput(
  candidate: {
    startMs: number;
    endMs: number;
    tags?: string[] | null;
    score?: number | null;
    rank?: number;
    previewStorageKey?: string | null;
    videoPreviewStorageKey?: string | null;
    metadata?: unknown;
  },
  fallbackRank: number,
) {
  return {
    startMs: candidate.startMs,
    endMs: candidate.endMs,
    tags: candidate.tags ?? ['highlight'],
    score: typeof candidate.score === 'number' ? candidate.score : null,
    rank: candidate.rank ?? fallbackRank,
    previewStorageKey: candidate.previewStorageKey ?? null,
    videoPreviewStorageKey: candidate.videoPreviewStorageKey ?? null,
    metadata: normalizeCandidateMetadata(candidate.metadata),
  };
}

export const directorAnalysisService = {
  /**
   * Start analysis job
   */
  async startAnalysis(
    sessionId: string,
    userId: string,
    options?: {
      targetDurationRange?: TargetDurationRange;
    },
  ) {
    const session = await directorRepo.findSession(sessionId, userId);

    if (!session) {
      throw new Error('Session not found');
    }

    if (!session.asset || session.asset.ingestStatus !== DirectorIngestStatus.READY) {
      throw new Error('Asset not ready for analysis');
    }

    if (
      session.analysisJob &&
      (session.analysisJob.status === DirectorJobStatus.PENDING ||
        session.analysisJob.status === DirectorJobStatus.PROCESSING)
    ) {
      return session.analysisJob;
    }

    const durationConfig = resolveTargetDurationRangeConfig(options?.targetDurationRange);
    const analysisConfig = {
      silenceThreshold: -30,
      silenceMinDuration: 0.5,
      sceneChangeThreshold: 0.4,
      minClipDuration: durationConfig.minClipDurationMs,
      maxClipDuration: durationConfig.maxClipDurationMs,
      maxCandidates: DEFAULT_MAX_CANDIDATES,
      targetDurationRange: durationConfig.targetDurationRange,
    };

    if (
      session.analysisJob?.status === DirectorJobStatus.COMPLETED &&
      isConfigCompatible(session.analysisJob.config, durationConfig.targetDurationRange)
    ) {
      return session.analysisJob;
    }

    // Update session step
    await directorRepo.updateStep(sessionId, userId, DirectorStep.ANALYZING);

    // Resolve absolute path (Docker-safe)
    const fileName = basename(session.asset.storageKey);
    const filePath = join(env.MEDIA_INPUT_DIR, 'director', fileName);

    // GATE: Minimum Duration Check (Smart AI)
    // Only analyze videos > 5 minutes (300s). AI Director is for Long-form -> Short-form.
    const { duration } = await directorProcessor.getVideoMetadata(filePath);
    if (duration > 0 && duration < 300) {
      // Revert status
      await directorRepo.updateStep(sessionId, userId, DirectorStep.IMPORT);
      throw new Error(
        'Video terlalu pendek (< 5 menit). AI Director dirancang untuk konten durasi panjang (minimal 5 menit).',
      );
    }

    const reusableCandidates = await directorAnalysisReuseService.getReusableCandidates(
      session.asset,
      durationConfig.targetDurationRange,
    );
    const reusableHardMaxDurationMs = resolveHardMaxCandidateDurationMs(
      analysisConfig.maxClipDuration,
    );
    const normalizedReusableCandidates = reusableCandidates
      ? removeOverlappingCandidates(
          filterCandidatesByMaxDuration(reusableCandidates, reusableHardMaxDurationMs),
        )
      : null;
    const compatibleReusableCandidates = normalizedReusableCandidates
      ? preferCandidatesWithinTargetDurationRange(
          normalizedReusableCandidates,
          durationConfig.targetDurationRange,
        )
      : null;

    if (
      reusableCandidates &&
      compatibleReusableCandidates &&
      compatibleReusableCandidates.candidates.length !== reusableCandidates.length
    ) {
      logger.info(
        {
          sessionId,
          droppedCount: reusableCandidates.length - compatibleReusableCandidates.candidates.length,
          hardMaxDurationMs: reusableHardMaxDurationMs,
          targetDurationRange: durationConfig.targetDurationRange,
          rangeFallbackApplied: compatibleReusableCandidates.fallbackApplied,
        },
        'Ignored stale reusable candidates outside short duration preference',
      );
    }
    if (compatibleReusableCandidates && compatibleReusableCandidates.candidates.length > 0) {
      const completedAt = new Date();
      const completedJob = await directorRepo.upsertAnalysisJobBySession(
        sessionId,
        {
          idempotencyKey: `${sessionId}:analyze:reused`,
          status: DirectorJobStatus.COMPLETED,
          startedAt: completedAt,
          completedAt,
          metrics: {
            reused: true,
            candidateCount: compatibleReusableCandidates.candidates.length,
            targetDurationRange: durationConfig.targetDurationRange,
            rangeFallbackApplied: compatibleReusableCandidates.fallbackApplied,
          },
          config: analysisConfig,
        },
        {
          status: DirectorJobStatus.COMPLETED,
          startedAt: session.analysisJob?.startedAt ?? completedAt,
          completedAt,
          errorMessage: null,
          metrics: {
            reused: true,
            candidateCount: compatibleReusableCandidates.candidates.length,
            targetDurationRange: durationConfig.targetDurationRange,
            rangeFallbackApplied: compatibleReusableCandidates.fallbackApplied,
          },
          config: analysisConfig,
        },
      );

      await directorRepo.replaceAnalysisCandidates(
        completedJob.id,
        compatibleReusableCandidates.candidates.map((candidate, index) =>
          toPersistedCandidateInput(candidate, index + 1),
        ),
      );

      await directorRepo.updateStep(sessionId, userId, DirectorStep.PICKING);
      logger.info(
        {
          sessionId,
          candidateCount: compatibleReusableCandidates.candidates.length,
          targetDurationRange: durationConfig.targetDurationRange,
          rangeFallbackApplied: compatibleReusableCandidates.fallbackApplied,
        },
        'Director analysis reused cached candidates',
      );
      return completedJob;
    }

    const job = await directorRepo.upsertAnalysisJobBySession(
      sessionId,
      {
        idempotencyKey: `${sessionId}:analyze:v1`,
        status: DirectorJobStatus.PENDING,
        config: analysisConfig,
      },
      {
        status: DirectorJobStatus.PENDING,
        completedAt: null,
        startedAt: null,
        errorMessage: null,
        metrics: Prisma.JsonNull,
        config: analysisConfig,
      },
    );

    // Add to BullMQ
    await directorQueue.add(
      'analyze',
      {
        type: 'ANALYSIS',
        sessionId,
        assetId: session.asset.id,
        filePath,
        userId: session.userId,
      },
      {
        jobId: buildDirectorQueueJobId('director', 'analyze', sessionId), // Idempotency
        removeOnComplete: true,
        removeOnFail: false,
      },
    );

    logger.info({ sessionId, jobId: job.id }, 'Director analysis job enqueued');

    return job;
  },

  /**
   * Get analysis result
   */
  async getAnalysisResult(sessionId: string, userId: string) {
    const session = await directorRepo.findSession(sessionId, userId);

    if (!session || !session.analysisJob) {
      throw new Error('Analysis not found');
    }

    const resolvedConfig = resolveClipDurationConfig(session.analysisJob.config);
    const hardMaxDurationMs = resolveHardMaxCandidateDurationMs(resolvedConfig.maxClipDurationMs);
    if (
      session.analysisJob.status === DirectorJobStatus.COMPLETED &&
      session.analysisJob.candidates.length === 0 &&
      session.asset
    ) {
      const reusableCandidates = await directorAnalysisReuseService.getReusableCandidates(
        session.asset,
        resolvedConfig.targetDurationRange,
      );
      const reusableCandidatesByDuration = preferCandidatesWithinTargetDurationRange(
        removeOverlappingCandidates(
          filterCandidatesByMaxDuration(reusableCandidates ?? [], hardMaxDurationMs),
        ),
        resolvedConfig.targetDurationRange,
      );
      return {
        ...session.analysisJob,
        candidates: reusableCandidatesByDuration.candidates,
      };
    }

    const normalizedCandidates = removeOverlappingCandidates(
      filterCandidatesByMaxDuration(session.analysisJob.candidates, hardMaxDurationMs),
    );
    const filteredCandidates = preferCandidatesWithinTargetDurationRange(
      normalizedCandidates,
      resolvedConfig.targetDurationRange,
    );

    if (filteredCandidates.candidates.length !== session.analysisJob.candidates.length) {
      logger.info(
        {
          sessionId,
          droppedCount:
            session.analysisJob.candidates.length - filteredCandidates.candidates.length,
          hardMaxDurationMs,
          targetDurationRange: resolvedConfig.targetDurationRange,
          rangeFallbackApplied: filteredCandidates.fallbackApplied,
        },
        'Filtered analysis candidates by short duration preference',
      );
    }

    return {
      ...session.analysisJob,
      candidates: filteredCandidates.candidates,
    };
  },

  /**
   * Select clips from candidates
   */
  async selectClips(sessionId: string, userId: string, candidateIds: string[]) {
    const session = await directorRepo.findSession(sessionId, userId);

    if (!session) {
      throw new Error('Session not found');
    }

    if (!session.analysisJob || session.analysisJob.status !== DirectorJobStatus.COMPLETED) {
      throw new Error('Analysis not completed');
    }

    if (candidateIds.length !== 1) {
      throw new Error('Pilih tepat 1 klip untuk membuat 1 short');
    }

    const resolvedConfig = resolveClipDurationConfig(session.analysisJob.config);
    const sourceCandidates =
      session.analysisJob.candidates.length > 0
        ? session.analysisJob.candidates
        : session.asset
          ? ((await directorAnalysisReuseService.getReusableCandidates(
              session.asset,
              resolvedConfig.targetDurationRange,
            )) ?? [])
          : [];
    const hardMaxDurationMs = resolveHardMaxCandidateDurationMs(resolvedConfig.maxClipDurationMs);
    const validationCandidates = sourceCandidates.map((candidate, index) => ({
      ...candidate,
      rank: candidate.rank ?? index + 1,
    }));
    const normalizedCandidates = removeOverlappingCandidates(
      filterCandidatesByMaxDuration(validationCandidates, hardMaxDurationMs),
    );
    const eligibleCandidates = preferCandidatesWithinTargetDurationRange(
      normalizedCandidates,
      resolvedConfig.targetDurationRange,
    );

    // Validate candidate IDs
    const validCandidateIds = eligibleCandidates.candidates.map((candidate) => candidate.id);
    const invalidIds = candidateIds.filter((id) => !validCandidateIds.includes(id));
    if (invalidIds.length > 0) {
      throw new Error(`Invalid candidate IDs: ${invalidIds.join(', ')}`);
    }

    let selectedCandidateIds = candidateIds;
    if (session.analysisJob.candidates.length === 0) {
      const persistedCandidates = await directorRepo.replaceAnalysisCandidates(
        session.analysisJob.id,
        eligibleCandidates.candidates.map((candidate, index) =>
          toPersistedCandidateInput(candidate, index + 1),
        ),
      );
      const persistedIdByReusableId = new Map(
        eligibleCandidates.candidates.map((candidate, index) => [
          candidate.id,
          persistedCandidates[index]?.id,
        ]),
      );

      selectedCandidateIds = candidateIds.map((candidateId) => {
        const mappedCandidateId = persistedIdByReusableId.get(candidateId);
        if (!mappedCandidateId) {
          throw new Error(`Failed to persist reusable candidate: ${candidateId}`);
        }
        return mappedCandidateId;
      });
    }

    // Clear existing selections
    await directorRepo.deleteSelectedClips(sessionId);

    // Create new selections
    const clips = await directorRepo.createSelectedClips(
      selectedCandidateIds.map((candidateId, index) => ({
        sessionId,
        candidateId,
        orderIndex: index,
        // Assuming other required fields are optional or have defaults in DB
      })),
    );

    // Update session step
    await directorRepo.updateStep(sessionId, userId, DirectorStep.EDITING);

    logger.info({ sessionId, clipCount: clips.length }, 'Clips selected');
    return clips;
  },

  /**
   * Get selected clips
   */
  async getSelectedClips(sessionId: string, userId: string) {
    const session = await directorRepo.findSession(sessionId, userId);

    if (!session) {
      throw new Error('Session not found');
    }

    // Debug log to check if transcript is present
    logger.info(
      {
        sessionId,
        clipCount: session.selectedClips.length,
        hasTranscript: session.selectedClips.some(
          (c: (typeof session.selectedClips)[number]) => !!c.transcript,
        ),
      },
      'getSelectedClips: Returning clips',
    );

    return session.selectedClips;
  },

  /**
   * Update a selected clip
   */
  async updateClip(
    sessionId: string,
    userId: string,
    clipId: string,
    updates: { trimStartMs?: number; trimEndMs?: number; orderIndex?: number },
  ) {
    const session = await directorRepo.exists(sessionId, userId);
    if (!session) {
      throw new Error('Session not found');
    }

    const clip = await directorRepo.findSelectedClip(clipId, sessionId);
    if (!clip) {
      throw new Error('Clip not found or access denied');
    }

    const updated = await directorRepo.updateSelectedClip(clipId, updates);
    return updated;
  },

  /**
   * Delete a selected clip
   */
  async deleteClip(sessionId: string, userId: string, clipId: string) {
    const sessionExists = await directorRepo.exists(sessionId, userId);
    if (!sessionExists) {
      throw new Error('Session not found');
    }

    const clip = await directorRepo.findSelectedClip(clipId, sessionId);
    if (!clip) {
      throw new Error('Clip not found or access denied');
    }

    await directorRepo.deleteSelectedClip(clipId);

    const remainingCount = await directorRepo.countSelectedClips(sessionId);
    if (remainingCount === 0) {
      await directorRepo.updateStep(sessionId, userId, DirectorStep.PICKING);
    }

    logger.info({ sessionId, clipId, remainingCount }, 'Selected clip deleted');

    return {
      deleted: true,
      remainingCount,
    };
  },
};
