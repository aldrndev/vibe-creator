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
        session.analysisJob.status === DirectorJobStatus.PROCESSING ||
        session.analysisJob.status === DirectorJobStatus.COMPLETED)
    ) {
      return session.analysisJob;
    }

    const analysisConfig = {
      silenceThreshold: -30,
      silenceMinDuration: 0.5,
      sceneChangeThreshold: 0.4,
      minClipDuration: 5000,
      maxClipDuration: 35000,
      maxCandidates: 20,
    };

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
    if (reusableCandidates && reusableCandidates.length > 0) {
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
            candidateCount: reusableCandidates.length,
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
            candidateCount: reusableCandidates.length,
          },
          config: analysisConfig,
        },
      );

      await directorRepo.updateStep(sessionId, userId, DirectorStep.PICKING);
      logger.info(
        { sessionId, candidateCount: reusableCandidates.length },
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
        candidates: reusableCandidates ?? [],
      };
    }

    return session.analysisJob;
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

    const sourceCandidates =
      session.analysisJob.candidates.length > 0
        ? session.analysisJob.candidates
        : session.asset
          ? ((await directorAnalysisReuseService.getReusableCandidates(session.asset)) ?? [])
          : [];

    // Validate candidate IDs
    const validCandidateIds = sourceCandidates.map((candidate) => candidate.id);
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
