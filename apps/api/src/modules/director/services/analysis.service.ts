/**
 * Director Analysis Service
 * Handles content analysis and clip selection
 */

import { basename, join } from 'node:path';
import { DirectorIngestStatus, DirectorJobStatus, DirectorStep, Prisma } from '@prisma/client';
import { env } from '@/config/env';
import { logger } from '@/lib/logger';
import { directorProcessor } from '../director.processor';
import { buildDirectorQueueJobId, directorQueue } from '../director.queue';
import { directorRepo } from '../director.repo';
import { directorAnalysisReuseService } from './analysis-reuse.service';

const DEFAULT_MIN_CLIP_DURATION_MS = 15000;
const DEFAULT_MAX_CLIP_DURATION_MS = 60000;
const DEFAULT_MAX_CANDIDATES = 20;
const DIALOG_COMPLETION_EXTENSION_MS = 30000;
const ABSOLUTE_MAX_SHORT_DURATION_MS = 90000;
const MIN_SCENE_GAP_MS = 200;

interface ClipDurationConfig {
  minClipDurationMs: number;
  maxClipDurationMs: number;
}

function parsePositiveNumber(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return fallback;
  }

  return value;
}

function resolveClipDurationConfig(config: unknown): ClipDurationConfig {
  if (typeof config !== 'object' || config === null || Array.isArray(config)) {
    return {
      minClipDurationMs: DEFAULT_MIN_CLIP_DURATION_MS,
      maxClipDurationMs: DEFAULT_MAX_CLIP_DURATION_MS,
    };
  }

  const cfg = config as Record<string, unknown>;
  return {
    minClipDurationMs: parsePositiveNumber(cfg.minClipDuration, DEFAULT_MIN_CLIP_DURATION_MS),
    maxClipDurationMs: parsePositiveNumber(cfg.maxClipDuration, DEFAULT_MAX_CLIP_DURATION_MS),
  };
}

function isConfigCompatible(config: unknown): boolean {
  const resolved = resolveClipDurationConfig(config);
  return (
    resolved.minClipDurationMs === DEFAULT_MIN_CLIP_DURATION_MS &&
    resolved.maxClipDurationMs === DEFAULT_MAX_CLIP_DURATION_MS
  );
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

function resolveHardMaxCandidateDurationMs(maxClipDurationMs: number): number {
  return Math.min(
    ABSOLUTE_MAX_SHORT_DURATION_MS,
    maxClipDurationMs + DIALOG_COMPLETION_EXTENSION_MS,
  );
}

export const directorAnalysisService = {
  /**
   * Start analysis job
   */
  async startAnalysis(sessionId: string, userId: string) {
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

    const analysisConfig = {
      silenceThreshold: -30,
      silenceMinDuration: 0.5,
      sceneChangeThreshold: 0.4,
      minClipDuration: DEFAULT_MIN_CLIP_DURATION_MS,
      maxClipDuration: DEFAULT_MAX_CLIP_DURATION_MS,
      maxCandidates: DEFAULT_MAX_CANDIDATES,
    };

    if (
      session.analysisJob?.status === DirectorJobStatus.COMPLETED &&
      isConfigCompatible(session.analysisJob.config)
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
    );
    const reusableHardMaxDurationMs = resolveHardMaxCandidateDurationMs(
      analysisConfig.maxClipDuration,
    );
    const compatibleReusableCandidates = reusableCandidates
      ? removeOverlappingCandidates(
          filterCandidatesByMaxDuration(reusableCandidates, reusableHardMaxDurationMs),
        )
      : null;

    if (
      reusableCandidates &&
      compatibleReusableCandidates &&
      compatibleReusableCandidates.length !== reusableCandidates.length
    ) {
      logger.info(
        {
          sessionId,
          droppedCount: reusableCandidates.length - compatibleReusableCandidates.length,
          hardMaxDurationMs: reusableHardMaxDurationMs,
        },
        'Ignored stale reusable candidates that exceed hard short duration limit',
      );
    }
    if (compatibleReusableCandidates && compatibleReusableCandidates.length > 0) {
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
            candidateCount: compatibleReusableCandidates.length,
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
            candidateCount: compatibleReusableCandidates.length,
          },
          config: analysisConfig,
        },
      );

      await directorRepo.updateStep(sessionId, userId, DirectorStep.PICKING);
      logger.info(
        { sessionId, candidateCount: compatibleReusableCandidates.length },
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
      );
      return {
        ...session.analysisJob,
        candidates: removeOverlappingCandidates(
          filterCandidatesByMaxDuration(reusableCandidates ?? [], hardMaxDurationMs),
        ),
      };
    }

    const filteredCandidates = removeOverlappingCandidates(
      filterCandidatesByMaxDuration(session.analysisJob.candidates, hardMaxDurationMs),
    );

    if (filteredCandidates.length !== session.analysisJob.candidates.length) {
      logger.info(
        {
          sessionId,
          droppedCount: session.analysisJob.candidates.length - filteredCandidates.length,
          hardMaxDurationMs,
        },
        'Filtered analysis candidates exceeding hard short duration limit',
      );
    }

    return {
      ...session.analysisJob,
      candidates: filteredCandidates,
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

    const sourceCandidates =
      session.analysisJob.candidates.length > 0
        ? session.analysisJob.candidates
        : session.asset
          ? ((await directorAnalysisReuseService.getReusableCandidates(session.asset)) ?? [])
          : [];
    const resolvedConfig = resolveClipDurationConfig(session.analysisJob.config);
    const hardMaxDurationMs = resolveHardMaxCandidateDurationMs(resolvedConfig.maxClipDurationMs);
    const validationCandidates = sourceCandidates.map((candidate) => ({
      id: candidate.id,
      startMs: candidate.startMs,
      endMs: candidate.endMs,
      rank: candidate.rank,
    }));
    const eligibleCandidates = removeOverlappingCandidates(
      filterCandidatesByMaxDuration(validationCandidates, hardMaxDurationMs),
    );

    // Validate candidate IDs
    const validCandidateIds = eligibleCandidates.map((candidate) => candidate.id);
    const invalidIds = candidateIds.filter((id) => !validCandidateIds.includes(id));
    if (invalidIds.length > 0) {
      throw new Error(`Invalid candidate IDs: ${invalidIds.join(', ')}`);
    }

    // Clear existing selections
    await directorRepo.deleteSelectedClips(sessionId);

    // Create new selections
    const clips = await directorRepo.createSelectedClips(
      candidateIds.map((candidateId, index) => ({
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
