/**
 * Director Analysis Service
 * Handles content analysis and clip selection
 */

import { basename, join } from 'node:path';
import { DirectorIngestStatus, DirectorJobStatus, DirectorStep } from '@prisma/client';
import { env } from '@/config/env';
import { logger } from '@/lib/logger';
import { directorProcessor } from '../director.processor';
import { directorQueue } from '../director.queue';
import { directorRepo } from '../director.repo';

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

    // Check if already has analysis job
    if (session.analysisJob) {
      return session.analysisJob;
    }

    const idempotencyKey = `${sessionId}:analyze:v1`;

    // Create analysis job
    const job = await directorRepo.createAnalysisJob({
      sessionId,
      idempotencyKey,
      status: DirectorJobStatus.PENDING,
      config: {
        silenceThreshold: -30,
        silenceMinDuration: 0.5,
        sceneChangeThreshold: 0.4,
        minClipDuration: 5000,
        maxClipDuration: 35000,
        maxCandidates: 20,
      },
    });

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
        jobId: `director:analyze:${sessionId}`, // Idempotency
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

    // Validate candidate IDs
    const validCandidateIds = session.analysisJob.candidates.map(
      (c: (typeof session.analysisJob.candidates)[number]) => c.id,
    );
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
};
