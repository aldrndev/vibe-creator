/**
 * @module director/handlers/analysis
 * @description BullMQ job handler for AI Director video analysis.
 *
 * This handler processes uploaded videos to:
 * - Extract audio proxy for analysis
 * - Detect highlight segments using energy/beat detection
 * - Generate thumbnail previews for each candidate clip
 * - Store results in database for user selection
 *
 * Job Type: ANALYSIS
 * Idempotent: Yes (checks for existing completion)
 */

import { existsSync } from 'node:fs';
import { mkdir, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import type { Prisma } from '@prisma/client';
import type { Job } from 'bullmq';
import { env } from '@/config/env';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { buildHeuristicScoreBreakdown } from '../analysis-score-breakdown';
import { directorProcessor } from '../director.processor';
import type { DirectorAnalysisJobData } from '../director.queue';
import { directorAnalysisAiRerankService } from '../services/analysis-ai-rerank.service';
import { directorAnalysisReuseService } from '../services/analysis-reuse.service';

const TEMP_DIR = join(env.MEDIA_INPUT_DIR, 'temp');

/**
 * Processes a video analysis job for the AI Director.
 *
 * @param job - BullMQ job containing session and asset information
 * @throws Error if session not found or FFmpeg processing fails
 *
 * @example
 * ```ts
 * // Enqueued by director.service
 * await directorQueue.add('analyze', {
 *   type: 'ANALYSIS',
 *   sessionId: 'xxx',
 *   assetId: 'yyy',
 *   filePath: '/path/to/video.mp4'
 * });
 * ```
 */

export async function processAnalysisJob(job: Job<DirectorAnalysisJobData>) {
  const { sessionId, assetId, filePath } = job.data;
  const logCtx = { jobId: job.id, sessionId, assetId };

  logger.info(logCtx, 'Starting analysis job');

  const session = await prisma.directorSession.findUnique({
    where: { id: sessionId },
    include: { analysisJob: true },
  });

  if (!session) {
    throw new Error(`Session not found: ${sessionId}`);
  }

  const existingJob = session.analysisJob?.status === 'COMPLETED';
  if (existingJob) {
    logger.info(logCtx, 'Analysis already completed for session');
    return;
  }

  const dbJob = session.analysisJob;

  if (dbJob) {
    await prisma.directorAnalysisJob.update({
      where: { id: dbJob.id },
      data: { status: 'PROCESSING' },
    });
  } else {
    logger.warn(logCtx, 'No analysis job record found in session');
  }

  let audioProxyPath: string | null = null;

  try {
    if (!existsSync(filePath)) {
      throw new Error(`Asset file missing at path: ${filePath}`);
    }

    const previewDir = join(env.MEDIA_INPUT_DIR, 'director', 'previews');
    if (!existsSync(previewDir)) {
      await mkdir(previewDir, { recursive: true });
    }

    audioProxyPath = await directorProcessor.extractAudioProxy(filePath, TEMP_DIR);

    const segments = await directorProcessor.detectSegments(audioProxyPath);

    const candidates = await directorProcessor.refineSegments(
      segments,
      audioProxyPath,
      {},
      filePath,
    );
    const rerankedCandidates = await directorAnalysisAiRerankService.rerankCandidates(
      candidates.map((candidate, index) => ({
        startMs: Math.round(candidate.start * 1000),
        endMs: Math.round(candidate.end * 1000),
        score: candidate.score,
        rank: index + 1,
        tags: candidate.tags && candidate.tags.length > 0 ? candidate.tags : ['highlight'],
        scoreBreakdown: buildHeuristicScoreBreakdown({
          durationSeconds: Math.round(candidate.duration),
          energyScore: candidate.analysis?.energyScore ?? 50,
          dialogDensityScore: candidate.analysis?.dialogDensityScore ?? 50,
          visualPenalty: candidate.analysis?.visualPenalty ?? 0,
          tags: candidate.tags && candidate.tags.length > 0 ? candidate.tags : ['highlight'],
        }),
      })),
    );

    logger.info({ ...logCtx, candidatesCount: rerankedCandidates.length }, 'Analysis complete');

    await prisma.$transaction(
      async (tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]) => {
        if (dbJob) {
          await tx.directorAnalysisJob.update({
            where: { id: dbJob.id },
            data: {
              status: 'COMPLETED',
              completedAt: new Date(),
            },
          });
        }

        if (rerankedCandidates.length > 0 && dbJob) {
          const candidatesWithPreviews = await Promise.all(
            rerankedCandidates.map(async (candidate, index) => {
              const midPointMs = Math.round((candidate.startMs + candidate.endMs) / 2);
              let previewKey: string | null = null;

              try {
                const previewFile = await directorProcessor.generateClipPreview(
                  filePath,
                  join(env.MEDIA_INPUT_DIR, 'director', 'previews'),
                  midPointMs,
                );

                if (previewFile) {
                  previewKey = `director/previews/${previewFile}`;
                }
              } catch (err) {
                logger.warn({ err, candidateIndex: index }, 'Failed to generate thumbnail preview');
              }

              return {
                analysisJobId: dbJob?.id,
                startMs: candidate.startMs,
                endMs: candidate.endMs,
                score: candidate.score,
                rank: candidate.rank,
                tags: candidate.tags,
                previewStorageKey: previewKey,
                metadata: candidate.metadata as Prisma.InputJsonValue,
              };
            }),
          );

          await tx.directorClipCandidate.createMany({
            data: candidatesWithPreviews,
          });
        }

        await tx.directorSession.update({
          where: { id: sessionId },
          data: { step: 'PICKING' },
        });
      },
    );

    if (session.analysisJob && rerankedCandidates.length > 0) {
      const persistedCandidates = await prisma.directorClipCandidate.findMany({
        where: {
          analysisJobId: session.analysisJob.id,
        },
        orderBy: {
          rank: 'asc',
        },
      });

      const asset = await prisma.directorAsset.findUnique({
        where: { id: assetId },
        select: {
          contentHash: true,
          sourceUrlNormalized: true,
          storageKey: true,
        },
      });

      if (asset) {
        await directorAnalysisReuseService.setReusableCandidates(asset, persistedCandidates);
      }
    }
  } catch (err) {
    logger.error({ ...logCtx, err }, 'Analysis job failed');

    if (dbJob) {
      await prisma.directorAnalysisJob.update({
        where: { id: dbJob.id },
        data: {
          status: 'FAILED',
          errorMessage: err instanceof Error ? err.message : 'Unknown error',
        },
      });
    }
    throw err;
  } finally {
    if (audioProxyPath && existsSync(audioProxyPath)) {
      try {
        await unlink(audioProxyPath);
        logger.debug(logCtx, 'Cleaned up audio proxy');
      } catch (cleanupErr) {
        logger.error({ ...logCtx, cleanupErr }, 'Failed to cleanup proxy');
      }
    }
  }
}
