import type { Prisma } from '@prisma/client';
import { logger } from '@/lib/logger';
import { transcribeService } from '@/modules/transcribe/transcribe.service';
import type { SubtitleSegment } from '@/modules/transcribe/transcribe-normalizer';
import type { HeuristicScoreBreakdown } from '../analysis-score-breakdown';

const EXPAND_WINDOW_MS = 8_000;
const HARD_MAX_CANDIDATE_DURATION_MS = 120_000;
const MIN_MEANINGFUL_TRANSCRIPT_WORDS = 8;
const MIN_MEANINGFUL_DURATION_MS = 20_000;
const COMPLETION_EDGE_GRACE_MS = 900;

interface TranscriptRefinementCandidate {
  startMs: number;
  endMs: number;
  score: number | null;
  rank: number;
  tags: string[];
  scoreBreakdown: HeuristicScoreBreakdown;
}

interface TranscriptRefinedCandidate extends TranscriptRefinementCandidate {
  refinementVersion: number;
  sourceStartMs: number;
  sourceEndMs: number;
  refinedStartMs: number;
  refinedEndMs: number;
  transcriptWindow: Prisma.JsonObject;
  transcriptCacheKey?: string | null;
}

interface RefineCandidatesOptions {
  candidates: TranscriptRefinementCandidate[];
  inputPath: string;
  audioProxyDir: string;
  assetFingerprint: string;
  mediaDurationMs: number;
}

interface AbsoluteSubtitleSegment extends SubtitleSegment {
  absoluteStartMs: number;
  absoluteEndMs: number;
}

function clampMs(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function countSegmentWords(segments: AbsoluteSubtitleSegment[]): number {
  return segments.reduce((total, segment) => total + countWords(segment.text), 0);
}

function normalizeBadges(badges: string[]): string[] {
  const seen = new Set<string>();
  const normalizedBadges: string[] = [];

  for (const badge of badges) {
    const normalized = badge.trim().toLowerCase();
    if (!normalized || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    normalizedBadges.push(badge);
  }

  return normalizedBadges;
}

function toAbsoluteSegments(
  segments: SubtitleSegment[],
  windowStartMs: number,
): AbsoluteSubtitleSegment[] {
  return segments
    .map((segment) => ({
      ...segment,
      absoluteStartMs: windowStartMs + segment.startMs,
      absoluteEndMs: windowStartMs + segment.endMs,
    }))
    .filter((segment) => segment.absoluteEndMs > segment.absoluteStartMs)
    .sort((left, right) => left.absoluteStartMs - right.absoluteStartMs);
}

function toRelativeSegments(
  segments: AbsoluteSubtitleSegment[],
  startMs: number,
  endMs: number,
): SubtitleSegment[] {
  const durationMs = Math.max(1, endMs - startMs);

  return segments
    .filter((segment) => segment.absoluteEndMs > startMs && segment.absoluteStartMs < endMs)
    .map((segment) => ({
      startMs: clampMs(segment.absoluteStartMs - startMs, 0, durationMs),
      endMs: clampMs(segment.absoluteEndMs - startMs, 0, durationMs),
      text: segment.text,
      speaker: segment.speaker,
    }))
    .filter((segment) => segment.endMs > segment.startMs && segment.text.trim().length > 0)
    .sort((left, right) => left.startMs - right.startMs);
}

function selectRelevantSegments(params: {
  segments: AbsoluteSubtitleSegment[];
  candidateStartMs: number;
  candidateEndMs: number;
}): AbsoluteSubtitleSegment[] {
  const startGuardMs = params.candidateStartMs - 1_200;
  const endGuardMs = params.candidateEndMs + EXPAND_WINDOW_MS;

  return params.segments.filter(
    (segment) => segment.absoluteEndMs >= startGuardMs && segment.absoluteStartMs <= endGuardMs,
  );
}

function resolveBoundaryConfidence(params: {
  isHanging: boolean;
  isThin: boolean;
  durationMs: number;
}): 'high' | 'medium' | 'low' {
  if (params.isThin || params.isHanging) {
    return 'low';
  }

  if (params.durationMs <= HARD_MAX_CANDIDATE_DURATION_MS) {
    return 'high';
  }

  return 'medium';
}

function resolveBoundaries(params: {
  candidate: TranscriptRefinementCandidate;
  relevantSegments: AbsoluteSubtitleSegment[];
  mediaDurationMs: number;
}): {
  startMs: number;
  endMs: number;
  isHanging: boolean;
  isThin: boolean;
  confidence: 'high' | 'medium' | 'low';
} {
  const { candidate, relevantSegments, mediaDurationMs } = params;
  const originalStartMs = candidate.startMs;
  const originalEndMs = candidate.endMs;

  if (relevantSegments.length === 0) {
    return {
      startMs: originalStartMs,
      endMs: originalEndMs,
      isHanging: true,
      isThin: true,
      confidence: 'low',
    };
  }

  const firstSegment = relevantSegments[0];
  const lastSegment = relevantSegments[relevantSegments.length - 1];
  const safeStartMs = clampMs(firstSegment?.absoluteStartMs ?? originalStartMs, 0, mediaDurationMs);
  const maxEndMs = Math.min(mediaDurationMs, safeStartMs + HARD_MAX_CANDIDATE_DURATION_MS);
  const endCandidate = relevantSegments
    .filter((segment) => segment.absoluteEndMs <= maxEndMs)
    .at(-1);
  const safeEndMs = clampMs(
    endCandidate?.absoluteEndMs ?? Math.min(originalEndMs, maxEndMs),
    safeStartMs + 1_000,
    maxEndMs,
  );
  const durationMs = safeEndMs - safeStartMs;
  const wordCount = countSegmentWords(relevantSegments);
  const isThin =
    wordCount < MIN_MEANINGFUL_TRANSCRIPT_WORDS || durationMs < MIN_MEANINGFUL_DURATION_MS;
  const isHanging =
    Boolean(lastSegment && lastSegment.absoluteEndMs > maxEndMs - COMPLETION_EDGE_GRACE_MS) ||
    safeEndMs >= maxEndMs - COMPLETION_EDGE_GRACE_MS;

  const confidence = resolveBoundaryConfidence({ isHanging, isThin, durationMs });

  return {
    startMs: safeStartMs,
    endMs: safeEndMs,
    isHanging,
    isThin,
    confidence,
  };
}

function applyTranscriptScore(
  candidate: TranscriptRefinementCandidate,
  params: {
    confidence: 'high' | 'medium' | 'low';
    isHanging: boolean;
    isThin: boolean;
  },
): Pick<TranscriptRefinementCandidate, 'score' | 'tags' | 'scoreBreakdown'> {
  let score = candidate.score ?? 0;
  const tags = new Set(candidate.tags);
  const badges = new Set(candidate.scoreBreakdown.badges);
  const topSignals = new Set(candidate.scoreBreakdown.topSignals);

  if (params.confidence === 'high') {
    score += 0.05;
    badges.add('Kalimat Selesai');
    topSignals.add('Transcript boundary aman');
  }

  if (params.isHanging) {
    score *= 0.68;
    tags.add('ENDING_CUT_RISK');
    badges.add('Butuh Review');
    topSignals.add('Ending berisiko menggantung');
  }

  if (params.isThin) {
    score *= 0.78;
    tags.add('THIN_TRANSCRIPT');
    topSignals.add('Transcript tipis');
  }

  return {
    score: Math.max(0.01, Math.min(0.99, score)),
    tags: [...tags],
    scoreBreakdown: {
      ...candidate.scoreBreakdown,
      badges: normalizeBadges([...badges]),
      topSignals: [...topSignals].slice(0, 4),
    },
  };
}

export const directorAnalysisTranscriptRefinementService = {
  async refineCandidates({
    candidates,
    inputPath,
    audioProxyDir,
    assetFingerprint,
    mediaDurationMs,
  }: RefineCandidatesOptions): Promise<TranscriptRefinedCandidate[]> {
    const refinedCandidates: TranscriptRefinedCandidate[] = [];

    for (const candidate of candidates) {
      const sourceStartMs = candidate.startMs;
      const sourceEndMs = candidate.endMs;
      const windowStartMs = clampMs(sourceStartMs - EXPAND_WINDOW_MS, 0, mediaDurationMs);
      const windowEndMs = clampMs(
        sourceEndMs + EXPAND_WINDOW_MS,
        windowStartMs + 1_000,
        mediaDurationMs,
      );

      try {
        const transcript = await transcribeService.transcribeClipRangeForCache({
          inputPath,
          audioProxyDir,
          assetFingerprint,
          startMs: windowStartMs,
          endMs: windowEndMs,
        });
        const absoluteSegments = toAbsoluteSegments(transcript.segments, windowStartMs);
        const relevantSegments = selectRelevantSegments({
          segments: absoluteSegments,
          candidateStartMs: sourceStartMs,
          candidateEndMs: sourceEndMs,
        });
        const boundaries = resolveBoundaries({
          candidate,
          relevantSegments,
          mediaDurationMs,
        });
        const scorePatch = applyTranscriptScore(candidate, {
          confidence: boundaries.confidence,
          isHanging: boundaries.isHanging,
          isThin: boundaries.isThin,
        });
        const relativeSegments = toRelativeSegments(
          relevantSegments,
          boundaries.startMs,
          boundaries.endMs,
        );
        const finalCacheKey =
          relativeSegments.length > 0
            ? await transcribeService.cacheTranscriptRange({
                assetFingerprint,
                startMs: boundaries.startMs,
                endMs: boundaries.endMs,
                segments: relativeSegments,
              })
            : null;

        refinedCandidates.push({
          ...candidate,
          ...scorePatch,
          startMs: boundaries.startMs,
          endMs: boundaries.endMs,
          refinementVersion: 2,
          sourceStartMs,
          sourceEndMs,
          refinedStartMs: boundaries.startMs,
          refinedEndMs: boundaries.endMs,
          transcriptCacheKey: finalCacheKey,
          transcriptWindow: {
            startMs: windowStartMs,
            endMs: windowEndMs,
            status: 'completed',
            cacheHit: transcript.cacheHit,
            segmentCount: transcript.segments.length,
            wordCount: countSegmentWords(absoluteSegments),
            boundaryConfidence: boundaries.confidence,
            isHanging: boundaries.isHanging,
            isThin: boundaries.isThin,
          },
        });
      } catch (error) {
        logger.warn(
          {
            error,
            sourceStartMs,
            sourceEndMs,
          },
          'Candidate partial transcript refinement failed',
        );

        refinedCandidates.push({
          ...candidate,
          refinementVersion: 2,
          sourceStartMs,
          sourceEndMs,
          refinedStartMs: candidate.startMs,
          refinedEndMs: candidate.endMs,
          transcriptCacheKey: null,
          transcriptWindow: {
            startMs: windowStartMs,
            endMs: windowEndMs,
            status: 'failed',
          },
        });
      }
    }

    return refinedCandidates.sort((left, right) => (right.score ?? 0) - (left.score ?? 0));
  },
};
