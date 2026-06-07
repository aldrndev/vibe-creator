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
import {
  DEFAULT_MAX_CANDIDATES,
  preferCandidatesWithinTargetDurationRange,
  resolveClipDurationConfig,
  resolveHardMaxCandidateDurationMs,
  type TargetDurationRange,
} from '../analysis-duration-config';
import { buildHeuristicScoreBreakdown } from '../analysis-score-breakdown';
import { directorProcessor } from '../director.processor';
import type { DirectorAnalysisJobData } from '../director.queue';
import { directorAnalysisAiRerankService } from '../services/analysis-ai-rerank.service';
import { directorAnalysisReuseService } from '../services/analysis-reuse.service';
import { directorAnalysisTranscriptRefinementService } from '../services/analysis-transcript-refinement.service';

const TEMP_DIR = join(env.MEDIA_INPUT_DIR, 'temp');
const HARD_MAX_CLIP_DURATION_SEC = 120;

function parsePositiveNumber(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return fallback;
  }

  return value;
}

function resolveAnalysisRefineOptions(config: unknown): {
  minDuration: number;
  maxDuration: number;
  maxCandidates: number;
  targetDurationRange: TargetDurationRange;
} {
  const resolvedConfig = resolveClipDurationConfig(config);
  const cfg =
    typeof config === 'object' && config !== null && !Array.isArray(config)
      ? (config as Record<string, unknown>)
      : {};
  const maxCandidates = Math.max(
    1,
    Math.min(
      env.DIRECTOR_ANALYSIS_REFINE_LIMIT,
      Math.round(parsePositiveNumber(cfg.maxCandidates, DEFAULT_MAX_CANDIDATES)),
    ),
  );

  const minDurationSec = Math.max(
    5,
    Math.min(HARD_MAX_CLIP_DURATION_SEC - 1, Math.round(resolvedConfig.minClipDurationMs / 1000)),
  );
  const maxDurationSec = Math.min(
    HARD_MAX_CLIP_DURATION_SEC,
    Math.max(minDurationSec + 1, Math.round(resolvedConfig.maxClipDurationMs / 1000)),
  );

  return {
    minDuration: minDurationSec,
    maxDuration: maxDurationSec,
    maxCandidates,
    targetDurationRange: resolvedConfig.targetDurationRange,
  };
}

async function saveCandidatesAndCompleteSession(
  sessionId: string,
  dbJob: { id: string } | null,
  rerankedCandidates: Array<{
    startMs: number;
    endMs: number;
    score: number;
    rank: number;
    tags: string[];
    metadata: unknown;
  }>,
  filePath: string,
) {
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
        await tx.directorClipCandidate.deleteMany({
          where: { analysisJobId: dbJob.id },
        });

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
              analysisJobId: dbJob.id,
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
}

async function cacheReusableCandidates(
  session: { analysisJob: { id: string } | null },
  assetId: string,
  targetDurationRange: TargetDurationRange,
) {
  if (session.analysisJob) {
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
      await directorAnalysisReuseService.setReusableCandidates(
        asset,
        persistedCandidates,
        targetDurationRange,
      );
    }
  }
}

async function generateAndRerankCandidates(
  filePath: string,
  audioProxyPath: string,
  analysisRefineOptions: ReturnType<typeof resolveAnalysisRefineOptions>,
  session: {
    asset: {
      contentHash: string | null;
      sourceUrlNormalized: string | null;
      storageKey: string;
      durationMs: number | null;
    } | null;
  },
) {
  const segments = await directorProcessor.detectSegments(audioProxyPath);

  const candidates = await directorProcessor.refineSegments(
    segments,
    audioProxyPath,
    analysisRefineOptions,
    filePath,
  );
  const hardMaxDurationSeconds =
    resolveHardMaxCandidateDurationMs(analysisRefineOptions.maxDuration * 1000) / 1000;
  const boundedCandidates = candidates.filter(
    (candidate) => candidate.duration <= hardMaxDurationSeconds,
  );
  const durationPreferredCandidates = preferCandidatesWithinTargetDurationRange(
    boundedCandidates.map((candidate, index) => ({
      startMs: Math.round(candidate.start * 1000),
      endMs: Math.round(candidate.end * 1000),
      score: candidate.score,
      rank: index + 1,
      tags: candidate.tags && candidate.tags.length > 0 ? candidate.tags : ['highlight'],
      scoreBreakdown: buildHeuristicScoreBreakdown(
        {
          durationSeconds: Math.round(candidate.duration),
          energyScore: candidate.analysis?.energyScore ?? 50,
          dialogDensityScore: candidate.analysis?.dialogDensityScore ?? 50,
          visualPenalty: candidate.analysis?.visualPenalty ?? 0,
          tags: candidate.tags && candidate.tags.length > 0 ? candidate.tags : ['highlight'],
        },
        { targetDurationRange: analysisRefineOptions.targetDurationRange },
      ),
    })),
    analysisRefineOptions.targetDurationRange,
  );
  const assetFingerprint =
    session.asset?.contentHash ?? session.asset?.sourceUrlNormalized ?? session.asset?.storageKey;
  const mediaDurationMs =
    session.asset?.durationMs ??
    Math.max(0, ...durationPreferredCandidates.candidates.map((candidate) => candidate.endMs));
  const transcriptRefinedCandidates = assetFingerprint
    ? await directorAnalysisTranscriptRefinementService.refineCandidates({
        candidates: durationPreferredCandidates.candidates,
        inputPath: filePath,
        audioProxyDir: TEMP_DIR,
        assetFingerprint,
        mediaDurationMs,
      })
    : durationPreferredCandidates.candidates;
  const rerankedCandidates = (
    await directorAnalysisAiRerankService.rerankCandidates(transcriptRefinedCandidates, {
      targetDurationRange: analysisRefineOptions.targetDurationRange,
    })
  ).slice(0, env.DIRECTOR_ANALYSIS_FINAL_LIMIT);

  return {
    rerankedCandidates,
    fallbackApplied: durationPreferredCandidates.fallbackApplied,
  };
}

async function handleAnalysisFailure(
  dbJob: { id: string } | null,
  err: unknown,
  logCtx: Record<string, unknown>,
) {
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
}

async function cleanupAudioProxy(audioProxyPath: string | null, logCtx: Record<string, unknown>) {
  if (audioProxyPath && existsSync(audioProxyPath)) {
    try {
      await unlink(audioProxyPath);
      logger.debug(logCtx, 'Cleaned up audio proxy');
    } catch (cleanupErr) {
      logger.error({ ...logCtx, cleanupErr }, 'Failed to cleanup proxy');
    }
  }
}

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
    include: { analysisJob: true, asset: true },
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

    const analysisRefineOptions = resolveAnalysisRefineOptions(dbJob?.config);
    const { rerankedCandidates, fallbackApplied } = await generateAndRerankCandidates(
      filePath,
      audioProxyPath,
      analysisRefineOptions,
      session,
    );

    logger.info(
      {
        ...logCtx,
        candidatesCount: rerankedCandidates.length,
        targetDurationRange: analysisRefineOptions.targetDurationRange,
        rangeFallbackApplied: fallbackApplied,
      },
      'Analysis complete',
    );

    await saveCandidatesAndCompleteSession(sessionId, dbJob, rerankedCandidates, filePath);

    if (session.analysisJob && rerankedCandidates.length > 0) {
      await cacheReusableCandidates(session, assetId, analysisRefineOptions.targetDurationRange);
    }
  } catch (err) {
    await handleAnalysisFailure(dbJob, err, logCtx);
    throw err;
  } finally {
    await cleanupAudioProxy(audioProxyPath, logCtx);
  }
}
