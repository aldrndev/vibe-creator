import { z } from 'zod';
import { logger } from '@/lib/logger';
import { redis } from '@/lib/redis';
import type { TargetDurationRange } from '../analysis-duration-config';
import { directorRepo } from '../director.repo';

const ANALYSIS_CACHE_TTL_SECONDS = 7 * 24 * 60 * 60;

const reusableCandidateSchema = z.object({
  id: z.string(),
  startMs: z.number(),
  endMs: z.number(),
  tags: z.array(z.string()),
  score: z.number().nullable(),
  rank: z.number(),
  previewStorageKey: z.string().nullable(),
  videoPreviewStorageKey: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

const reusableCandidateListSchema = z.array(reusableCandidateSchema);

export type ReusableAnalysisCandidate = z.infer<typeof reusableCandidateSchema>;

type ReusableAnalysisCandidateInput = Omit<ReusableAnalysisCandidate, 'metadata'> & {
  metadata?: unknown;
};

interface AssetFingerprintInput {
  contentHash?: string | null;
  sourceUrlNormalized?: string | null;
  storageKey: string;
}

function getAssetFingerprint(asset: AssetFingerprintInput): string {
  return asset.contentHash ?? asset.sourceUrlNormalized ?? asset.storageKey;
}

function getAnalysisCacheKey(
  asset: AssetFingerprintInput,
  targetDurationRange: TargetDurationRange,
): string {
  return `director:analysis-cache:${targetDurationRange}:${getAssetFingerprint(asset)}`;
}

function normalizeCandidateMetadata(metadata: unknown): Record<string, unknown> {
  if (typeof metadata !== 'object' || metadata === null || Array.isArray(metadata)) {
    return {};
  }

  return metadata as Record<string, unknown>;
}

function normalizeReusableCandidates(
  candidates: ReusableAnalysisCandidateInput[],
): ReusableAnalysisCandidate[] {
  return candidates.map((candidate) => ({
    ...candidate,
    metadata: normalizeCandidateMetadata(candidate.metadata),
  }));
}

export const directorAnalysisReuseService = {
  async getReusableCandidates(
    asset: AssetFingerprintInput,
    targetDurationRange: TargetDurationRange = 'auto',
  ): Promise<ReusableAnalysisCandidate[] | null> {
    const cacheKey = getAnalysisCacheKey(asset, targetDurationRange);

    if (redis.status === 'ready') {
      const cached = await redis.get(cacheKey);
      if (cached) {
        try {
          return reusableCandidateListSchema.parse(JSON.parse(cached));
        } catch (error) {
          logger.warn(
            { error, cacheKey },
            'Failed to parse cached director analysis reuse payload',
          );
        }
      }
    }

    const reusableAnalysis = await directorRepo.findLatestReusableAnalysisByAsset(
      asset,
      targetDurationRange,
    );
    const candidates = normalizeReusableCandidates(reusableAnalysis?.candidates ?? []);

    if (candidates.length === 0) {
      return null;
    }

    await this.setReusableCandidates(asset, candidates, targetDurationRange);
    return candidates;
  },

  async setReusableCandidates(
    asset: AssetFingerprintInput,
    candidates: ReusableAnalysisCandidateInput[],
    targetDurationRange: TargetDurationRange = 'auto',
  ): Promise<void> {
    if (redis.status !== 'ready' || candidates.length === 0) {
      return;
    }

    const cacheKey = getAnalysisCacheKey(asset, targetDurationRange);
    await redis.set(
      cacheKey,
      JSON.stringify(normalizeReusableCandidates(candidates)),
      'EX',
      ANALYSIS_CACHE_TTL_SECONDS,
    );
  },
};
