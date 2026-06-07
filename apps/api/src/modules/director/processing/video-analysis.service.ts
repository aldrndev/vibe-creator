/**
 * Video Analysis Service
 * Handles content analysis (silence detection, visual quality, energy).
 */

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { logger } from '@/lib/logger';
import type { AnalysisOptions, Segment } from './types';

const ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg';
const IDEAL_SHORT_MIN_DURATION = 40;
const IDEAL_SHORT_MAX_DURATION = 60;
const DEFAULT_UNIFORM_WINDOW_DURATIONS_SEC = [36, 48, 60] as const;
const DEFAULT_UNIFORM_WINDOW_STRIDE_SEC = 12;
const MIN_SCENE_GAP_SEC = 0.2;
const DEFAULT_MIN_CANDIDATE_DURATION_SEC = 15;
const DIALOG_SAFE_ANCHOR_GRACE_SEC = 8;
const DIALOG_COMPLETION_EXTENSION_SEC = 20;
const MAX_SHORT_CANDIDATE_DURATION_SEC = 120;
const UNIFORM_FALLBACK_TAG = 'UNIFORM_FALLBACK';

interface DetectionResult {
  segments: Segment[];
  totalDuration: number;
}

interface MergeableSegment extends Segment {
  pauseAnchors: number[];
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function getDistanceFromDurationWindow(
  duration: number,
  minDuration: number,
  maxDuration: number,
): number {
  if (duration < minDuration) {
    return minDuration - duration;
  }

  if (duration > maxDuration) {
    return duration - maxDuration;
  }

  return 0;
}

function getDurationFitScoreForWindow(
  duration: number,
  minDuration: number,
  maxDuration: number,
): number {
  if (duration >= minDuration && duration <= maxDuration) {
    return 92;
  }

  const extendedMaxDuration = Math.min(
    MAX_SHORT_CANDIDATE_DURATION_SEC,
    maxDuration + DIALOG_COMPLETION_EXTENSION_SEC,
  );
  if (duration > maxDuration && duration <= extendedMaxDuration) {
    return clampScore(86 - (duration - maxDuration) * 0.6);
  }

  const nearMinDuration = Math.max(DEFAULT_MIN_CANDIDATE_DURATION_SEC, minDuration - 10);
  if (duration >= nearMinDuration && duration < minDuration) {
    return clampScore(80 - (minDuration - duration) * 1.4);
  }

  if (duration < nearMinDuration) {
    return clampScore(50 - (nearMinDuration - duration) * 2.2);
  }

  return clampScore(64 - (duration - extendedMaxDuration) * 2.2);
}

function getDurationFitScore(duration: number): number {
  return getDurationFitScoreForWindow(duration, IDEAL_SHORT_MIN_DURATION, IDEAL_SHORT_MAX_DURATION);
}

function resolveDurationScoringWindow(
  minDuration: number,
  maxDuration: number,
): {
  minDuration: number;
  maxDuration: number;
} {
  const isAutoWindow =
    minDuration <= DEFAULT_MIN_CANDIDATE_DURATION_SEC && maxDuration === IDEAL_SHORT_MAX_DURATION;

  if (isAutoWindow) {
    return {
      minDuration: IDEAL_SHORT_MIN_DURATION,
      maxDuration: IDEAL_SHORT_MAX_DURATION,
    };
  }

  return { minDuration, maxDuration };
}

function buildTargetUniformDurations(minDuration: number, maxDuration: number): number[] {
  const boundedMinDuration = Math.max(18, Math.round(minDuration));
  const boundedMaxDuration = Math.min(
    MAX_SHORT_CANDIDATE_DURATION_SEC,
    Math.max(boundedMinDuration, Math.round(maxDuration)),
  );
  const midpointDuration = Math.round((boundedMinDuration + boundedMaxDuration) / 2);

  return Array.from(new Set([boundedMinDuration, midpointDuration, boundedMaxDuration]));
}

function resolveUniformStride(minDuration: number): number {
  return Math.max(DEFAULT_UNIFORM_WINDOW_STRIDE_SEC, Math.round(minDuration / 3));
}

export function buildUniformWindows(
  totalDuration: number,
  durationsSec: readonly number[] = DEFAULT_UNIFORM_WINDOW_DURATIONS_SEC,
  strideSec = DEFAULT_UNIFORM_WINDOW_STRIDE_SEC,
): Segment[] {
  if (!Number.isFinite(totalDuration) || totalDuration <= 0) {
    return [];
  }

  const windows: Segment[] = [];
  for (const preferredDuration of durationsSec) {
    let start = 0;
    while (start + 18 <= totalDuration) {
      const duration = Math.min(preferredDuration, totalDuration - start);
      if (duration < 18) {
        break;
      }

      windows.push({
        start,
        end: start + duration,
        duration,
        score: 0.72 + getDurationFitScore(duration) / 500,
        activeDuration: duration * 0.82,
        tags: [UNIFORM_FALLBACK_TAG],
      });

      start += strideSec;
    }
  }

  const dedupedWindows = new Map<string, Segment>();
  for (const window of windows) {
    dedupedWindows.set(`${window.start.toFixed(2)}-${window.end.toFixed(2)}`, window);
  }

  if (dedupedWindows.size === 0) {
    dedupedWindows.set('0-full', {
      start: 0,
      end: totalDuration,
      duration: totalDuration,
      score: 0.74,
      activeDuration: totalDuration * 0.82,
      tags: [UNIFORM_FALLBACK_TAG],
    });
  }

  return [...dedupedWindows.values()].sort((left, right) => left.start - right.start);
}

function pickNearestAnchor(anchors: number[], target: number): number | null {
  if (anchors.length === 0) {
    return null;
  }

  let best = anchors[0] ?? null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const anchor of anchors) {
    const distance = Math.abs(anchor - target);
    if (distance < bestDistance) {
      best = anchor;
      bestDistance = distance;
    }
  }

  return best;
}

export function splitSegmentAtSmartPauses(params: {
  segment: MergeableSegment;
  minDuration: number;
  preferredMaxDuration: number;
  hardMaxDuration: number;
}): Segment[] {
  const { segment, minDuration, preferredMaxDuration, hardMaxDuration } = params;
  if (segment.duration <= hardMaxDuration) {
    return [segment];
  }

  const chunks: Segment[] = [];
  const sortedAnchors = [...segment.pauseAnchors].sort((left, right) => left - right);
  let chunkStart = segment.start;

  while (chunkStart + minDuration <= segment.end) {
    const preferredEnd = Math.min(chunkStart + preferredMaxDuration, segment.end);
    const hardEnd = Math.min(chunkStart + hardMaxDuration, segment.end);
    const minEnd = chunkStart + minDuration;
    const maxDialogSafeEnd = Math.min(segment.end, hardEnd + DIALOG_SAFE_ANCHOR_GRACE_SEC);
    const usableAnchors = sortedAnchors.filter(
      (anchor) => anchor >= minEnd && anchor <= maxDialogSafeEnd,
    );
    const nearestPauseAnchor = pickNearestAnchor(usableAnchors, preferredEnd);
    const hasNoPauseAnchor = nearestPauseAnchor === null;
    const canKeepRemainingDialog =
      hasNoPauseAnchor &&
      segment.end - chunkStart <= hardMaxDuration + DIALOG_SAFE_ANCHOR_GRACE_SEC;

    const nextEnd = canKeepRemainingDialog
      ? segment.end
      : (nearestPauseAnchor ?? Math.min(Math.max(preferredEnd, minEnd), hardEnd));

    if (nextEnd <= chunkStart + 0.05) {
      break;
    }

    const remaining = segment.end - nextEnd;
    const finalEnd = remaining > 0 && remaining < minDuration ? segment.end : nextEnd;

    chunks.push({
      start: chunkStart,
      end: finalEnd,
      duration: finalEnd - chunkStart,
      score: segment.score,
      activeDuration: finalEnd - chunkStart,
    });

    if (finalEnd >= segment.end - 0.05) {
      break;
    }

    chunkStart = finalEnd;
  }

  return chunks.length > 0 ? chunks : [segment];
}

export function hasMeaningfulOverlap(left: Segment, right: Segment): boolean {
  if (left.end <= right.start) {
    return right.start - left.end < MIN_SCENE_GAP_SEC;
  }

  if (right.end <= left.start) {
    return left.start - right.end < MIN_SCENE_GAP_SEC;
  }

  return true;
}

export function pickNonOverlappingCandidates(
  candidates: Array<Segment & { tags?: string[] }>,
  maxCandidates: number,
): Array<Segment & { tags?: string[] }> {
  const selected: Array<Segment & { tags?: string[] }> = [];

  for (const candidate of candidates) {
    const isOverlapping = selected.some((existing) => hasMeaningfulOverlap(existing, candidate));
    if (isOverlapping) {
      continue;
    }

    selected.push(candidate);
    if (selected.length >= maxCandidates) {
      break;
    }
  }

  return selected.sort((left, right) => left.start - right.start);
}

function extractSilencesFromOutput(output: string): { start: number; end: number }[] {
  const silenceRegex = /silence_(start|end): ([\d.]+)/g;
  const silences: { start: number; end: number }[] = [];

  let match: RegExpExecArray | null = silenceRegex.exec(output);
  let currentStart: number | null = null;

  while (match) {
    const type = match[1];
    const time = Number.parseFloat(match[2] as string);

    if (type === 'start') {
      currentStart = time;
    } else if (type === 'end' && currentStart !== null) {
      silences.push({ start: currentStart, end: time });
      currentStart = null;
    }

    match = silenceRegex.exec(output);
  }

  return silences;
}

function parseTotalDuration(output: string): number | null {
  const durationMatch = /Duration: (\d{2}):(\d{2}):(\d{2}).(\d{2})/.exec(output);
  if (!durationMatch) {
    return null;
  }
  const [, hours, minutes, seconds, centiseconds] = durationMatch;
  return (
    Number.parseInt(hours ?? '0', 10) * 3600 +
    Number.parseInt(minutes ?? '0', 10) * 60 +
    Number.parseFloat(`${seconds ?? '0'}.${centiseconds ?? '0'}`)
  );
}

function parseSilenceDetectionOutput(output: string): DetectionResult {
  const silences = extractSilencesFromOutput(output);
  const parsedDuration = parseTotalDuration(output);

  if (parsedDuration === null) {
    logger.warn('Could not parse duration from ffmpeg output');
    return { segments: [], totalDuration: 0 };
  }

  const totalDuration = parsedDuration;

  const segments: Segment[] = [];
  let lastEnd = 0;

  for (const silence of silences) {
    if (silence.start > lastEnd + 0.1) {
      segments.push({
        start: lastEnd,
        end: silence.start,
        duration: silence.start - lastEnd,
        score: 0.8,
        activeDuration: silence.start - lastEnd,
      });
    }
    lastEnd = silence.end;
  }

  if (totalDuration > lastEnd + 0.1) {
    segments.push({
      start: lastEnd,
      end: totalDuration,
      duration: totalDuration - lastEnd,
      score: 0.8,
      activeDuration: totalDuration - lastEnd,
    });
  }

  return { segments, totalDuration };
}

function mergeCloseSegments(segments: Segment[], mergeGap: number): MergeableSegment[] {
  const merged: MergeableSegment[] = [];
  const firstSegment = segments[0];
  let current: MergeableSegment | undefined = firstSegment
    ? {
        ...firstSegment,
        pauseAnchors: [firstSegment.end],
      }
    : undefined;

  if (!current) return [];

  for (let i = 1; i < segments.length; i++) {
    const next: Segment | undefined = segments[i];
    if (!next) continue;

    if (next.start - current.end <= mergeGap) {
      current.end = next.end;
      current.duration = current.end - current.start;
      current.activeDuration =
        (current.activeDuration || 0) + (next.activeDuration || next.duration);
      current.pauseAnchors.push(next.end);
    } else {
      merged.push(current);
      current = {
        ...next,
        pauseAnchors: [next.end],
      };
    }
  }
  merged.push(current);
  return merged;
}

function gatherInitialCandidates(
  segments: Segment[],
  mergeGap: number,
  scoringWindow: { minDuration: number; maxDuration: number },
  candidateMinDuration: number,
  preferredMaxDuration: number,
  hardMaxDuration: number,
): Segment[] {
  const isUniformFallbackMode = segments.every((segment) =>
    segment.tags?.includes(UNIFORM_FALLBACK_TAG),
  );

  let merged: MergeableSegment[] = [];
  if (isUniformFallbackMode) {
    const totalDuration = Math.max(...segments.map((segment) => segment.end));
    const targetUniformWindows = buildUniformWindows(
      totalDuration,
      buildTargetUniformDurations(scoringWindow.minDuration, scoringWindow.maxDuration),
      resolveUniformStride(scoringWindow.minDuration),
    );
    const sourceSegments = targetUniformWindows.length > 0 ? targetUniformWindows : segments;
    merged = sourceSegments.map((segment) => ({
      ...segment,
      pauseAnchors: [segment.end],
    }));
  } else {
    merged = mergeCloseSegments(segments, mergeGap);
  }

  const candidates: Segment[] = [];
  for (const s of merged) {
    if (s.duration < candidateMinDuration) continue;

    if (s.duration <= hardMaxDuration) {
      candidates.push(s);
    } else {
      const smartChunks = splitSegmentAtSmartPauses({
        segment: s,
        minDuration: candidateMinDuration,
        preferredMaxDuration,
        hardMaxDuration,
      });
      candidates.push(...smartChunks);
    }
  }

  return candidates;
}

function getDurationScoreAdjustment(
  duration: number,
  scoringWindow: { minDuration: number; maxDuration: number },
  candidateMinDuration: number,
): number {
  if (duration >= scoringWindow.minDuration && duration <= scoringWindow.maxDuration) {
    return 0.16;
  }

  const extendedMaxDuration = Math.min(
    MAX_SHORT_CANDIDATE_DURATION_SEC,
    scoringWindow.maxDuration + DIALOG_COMPLETION_EXTENSION_SEC,
  );

  if (duration > scoringWindow.maxDuration && duration <= extendedMaxDuration) {
    return 0.08;
  }

  const nearMinDuration = Math.max(candidateMinDuration, scoringWindow.minDuration - 8);

  if (duration >= nearMinDuration && duration < scoringWindow.minDuration) {
    return 0.04;
  }

  const durationDistance = getDistanceFromDurationWindow(
    duration,
    scoringWindow.minDuration,
    scoringWindow.maxDuration,
  );
  return -Math.min(0.18, durationDistance / 500);
}

function calculateCandidateScoreAdjustments(
  score: number,
  meanVolume: number,
  tags: string[],
  c: Segment,
  scoringWindow: { minDuration: number; maxDuration: number },
  candidateMinDuration: number,
  hasBlackScreen: boolean,
  isStatic: boolean,
) {
  let adjustedScore = score;
  const finalTags = [...tags];
  let visualPenalty = 0;

  if (meanVolume > -18) {
    adjustedScore += 0.15;
    finalTags.push('HIGH ENERGY');
  } else if (meanVolume > -25) {
    adjustedScore += 0.05;
  } else {
    adjustedScore -= 0.1;
  }

  adjustedScore += getDurationScoreAdjustment(c.duration, scoringWindow, candidateMinDuration);

  const activeDur = c.activeDuration || c.duration;
  const density = activeDur / c.duration;

  if (density >= 0.9) {
    adjustedScore += 0.1;
    if (!finalTags.includes('HIGH ENERGY')) finalTags.push('DENSE SPEECH');
  } else if (density < 0.6) {
    adjustedScore -= 0.15;
  }

  if (hasBlackScreen) {
    adjustedScore -= 0.3;
    finalTags.push('BLACK SCREEN');
    visualPenalty += 55;
  }
  if (isStatic) {
    adjustedScore -= 0.2;
    finalTags.push('STATIC');
    visualPenalty += 35;
  }

  return { adjustedScore, finalTags, visualPenalty, density };
}

async function analyzeCandidate(
  c: Segment,
  audioPath: string,
  videoPath: string | undefined,
  scoringWindow: { minDuration: number; maxDuration: number },
  candidateMinDuration: number,
  service: typeof videoAnalysisService,
): Promise<Segment & { tags?: string[] }> {
  const { meanVolume, maxVolume } = await service.analyzeSegmentEnergy(
    audioPath,
    c.start,
    c.duration,
  );

  const initialTags: string[] = (c.tags ?? []).filter((tag) => tag !== UNIFORM_FALLBACK_TAG);
  let hasBlackScreen = false;
  let isStatic = false;

  if (videoPath) {
    const visuals = await service.analyzeSegmentVisuals(videoPath, c.start, c.duration);
    hasBlackScreen = visuals.hasBlackScreen;
    isStatic = visuals.isStatic;
  }

  const { adjustedScore, finalTags, visualPenalty, density } = calculateCandidateScoreAdjustments(
    c.score,
    meanVolume,
    initialTags,
    c,
    scoringWindow,
    candidateMinDuration,
    hasBlackScreen,
    isStatic,
  );

  const energyScore = clampScore((meanVolume + 45) * 4);
  const dialogDensityScore = clampScore(density * 100);
  const durationFitScore = getDurationFitScoreForWindow(
    c.duration,
    scoringWindow.minDuration,
    scoringWindow.maxDuration,
  );

  return {
    ...c,
    score: Math.min(adjustedScore, 0.99),
    tags: finalTags,
    analysis: {
      meanVolume,
      maxVolume,
      speechDensity: density,
      energyScore,
      dialogDensityScore,
      durationFitScore,
      visualPenalty: clampScore(visualPenalty),
      hasBlackScreen,
      isStatic,
    },
  };
}

export const videoAnalysisService = {
  /**
   * Detect active segments by analyzing silence.
   * Runs silencedetect and inverts the result.
   * IMPROVED: Adaptive threshold and fallback to ensure clips are found.
   */
  async detectSegments(audioPath: string): Promise<Segment[]> {
    if (!existsSync(audioPath)) {
      throw new Error(`Audio proxy not found: ${audioPath}`);
    }

    // Helper to run detection with specific threshold
    const runDetection = (thresholdDb: number): Promise<DetectionResult> => {
      const args = [
        '-i',
        audioPath,
        '-af',
        `highpass=f=300,silencedetect=noise=${thresholdDb}dB:d=0.5`,
        '-f',
        'null',
        '-',
      ];

      return new Promise((resolve, reject) => {
        const proc = spawn(ffmpegPath, args);
        let output = '';
        proc.stderr.on('data', (data) => (output += data.toString()));

        proc.on('close', (code) => {
          if (code !== 0) return reject(new Error(`Silence detection failed: ${code}`));
          resolve(parseSilenceDetectionOutput(output));
        });
      });
    };

    logger.info('Running adaptive silence detection');

    // 1. Try strict threshold (-40dB)
    const detection = await runDetection(-40);
    let segments = detection.segments;
    let totalDuration = detection.totalDuration;

    // 2. If few segments, try looser (-30dB)
    if (segments.length < 5) {
      logger.info('Few segments found at -40dB, retrying at -30dB');
      const looseDetection = await runDetection(-30);
      if (looseDetection.segments.length > segments.length) {
        segments = looseDetection.segments;
        totalDuration = looseDetection.totalDuration || totalDuration;
      }
    }

    // 3. Even looser (-20dB) if still struggling
    if (segments.length < 3) {
      logger.info('Very few segments, retrying at -20dB');
      const veryLooseDetection = await runDetection(-20);
      if (veryLooseDetection.segments.length > segments.length) {
        segments = veryLooseDetection.segments;
        totalDuration = veryLooseDetection.totalDuration || totalDuration;
      }
    }

    // 4. Fallback: Uniform Grid Slicing if almost nothing found
    const firstSegment = segments[0];
    if (
      segments.length === 0 ||
      (segments.length === 1 && firstSegment && firstSegment.duration > 90)
    ) {
      logger.info(
        { totalDuration, fallbackWindowDurations: DEFAULT_UNIFORM_WINDOW_DURATIONS_SEC },
        'Fallback: Uniform window segment generation',
      );
      if (totalDuration > 0) {
        return buildUniformWindows(totalDuration);
      }
    }

    return segments;
  },

  /**
   * Analyze visual quality (Black frames & Freeze frames)
   * Uses original video file, but only scans the specific segment (Fast).
   */
  async analyzeSegmentVisuals(
    videoPath: string,
    start: number,
    duration: number,
  ): Promise<{ hasBlackScreen: boolean; isStatic: boolean }> {
    return new Promise((resolve) => {
      const args = [
        '-ss',
        start.toString(),
        '-t',
        duration.toString(),
        '-i',
        videoPath,
        '-vf',
        'blackdetect=d=0.1:pix_th=0.1,freezedetect=n=0.003:d=2', // Black > 0.1s, Freeze > 2s
        '-f',
        'null',
        '-',
      ];

      const proc = spawn(ffmpegPath, args);
      let output = '';
      proc.stderr.on('data', (data) => (output += data.toString()));

      proc.on('close', () => {
        const hasBlack = /black_start:/.test(output);
        const hasFreeze = /lavfi\.freezedetect\.freeze_start:/.test(output);
        resolve({ hasBlackScreen: hasBlack, isStatic: hasFreeze });
      });

      proc.on('error', () => {
        resolve({ hasBlackScreen: false, isStatic: false });
      });
    });
  },

  /**
   * Analyze audio energy for a specific segment
   */
  async analyzeSegmentEnergy(
    audioPath: string,
    start: number,
    duration: number,
  ): Promise<{ meanVolume: number; maxVolume: number }> {
    return new Promise((resolve) => {
      const args = [
        '-ss',
        start.toString(),
        '-t',
        duration.toString(),
        '-i',
        audioPath,
        '-af',
        'highpass=f=300,volumedetect',
        '-f',
        'null',
        '-',
      ];

      const proc = spawn(ffmpegPath, args);
      let output = '';
      proc.stderr.on('data', (data) => (output += data.toString()));

      proc.on('close', () => {
        // Parse mean_volume and max_volume
        const meanMatch = /mean_volume: ([-\d.]+) dB/.exec(output);
        const maxMatch = /max_volume: ([-\d.]+) dB/.exec(output);

        const meanVolume = meanMatch?.[1] ? Number.parseFloat(meanMatch[1]) : -91;
        const maxVolume = maxMatch?.[1] ? Number.parseFloat(maxMatch[1]) : -91;

        resolve({
          meanVolume,
          maxVolume,
        });
      });

      proc.on('error', () => {
        resolve({ meanVolume: -91, maxVolume: -91 });
      });
    });
  },

  /**
   * Refine segments with intelligent merging, splitting, and energy analysis.
   */
  async refineSegments(
    segments: Segment[],
    audioPath: string,
    options: AnalysisOptions = {},
    videoPath?: string,
  ): Promise<(Segment & { tags?: string[] })[]> {
    const { minDuration = 15, maxDuration = 60, mergeGap = 0.5, maxCandidates = 20 } = options;
    const scoringWindow = resolveDurationScoringWindow(minDuration, maxDuration);
    const candidateMinDuration = Math.min(DEFAULT_MIN_CANDIDATE_DURATION_SEC, minDuration);
    const preferredMaxDuration = Math.max(minDuration + 1, maxDuration);
    const hardMaxDuration = Math.min(
      MAX_SHORT_CANDIDATE_DURATION_SEC,
      preferredMaxDuration + DIALOG_COMPLETION_EXTENSION_SEC,
    );
    if (segments.length === 0) return [];

    const candidates = gatherInitialCandidates(
      segments,
      mergeGap,
      scoringWindow,
      candidateMinDuration,
      preferredMaxDuration,
      hardMaxDuration,
    );

    const analyzed = await Promise.all(
      candidates.map((c) =>
        analyzeCandidate(c, audioPath, videoPath, scoringWindow, candidateMinDuration, this),
      ),
    );

    analyzed.sort((a, b) => b.score - a.score);
    return pickNonOverlappingCandidates(analyzed, maxCandidates);
  },
};
