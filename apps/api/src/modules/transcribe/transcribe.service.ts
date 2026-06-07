import fs from 'node:fs/promises';
import path from 'node:path';
import { env } from '@/config/env';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import {
  DEFAULT_TRANSCRIBE_LANGUAGE,
  isAutoTranscribeLanguage,
  normalizeTranscribeLanguage,
  type TranscribeLanguage,
} from '@/modules/transcribe/transcribe-language';
import { directorProcessor } from '../director/director.processor';
import { resolveSelectedClipRangeMs } from '../director/selected-clip-range';
import {
  parseTranscribeProgressMeta,
  toTranscribeProgressJson,
  updateTranscribeProgressMeta,
} from '../director/services/transcribe-progress';
import { transcribeCacheService } from './transcribe-cache.service';
import type { SubtitleSegment } from './transcribe-normalizer';
import { transcribeNormalizer } from './transcribe-normalizer';
import {
  getTranscriptTailRecoveryWindow,
  offsetRecoveredTailSegments,
} from './transcript-tail-recovery';
import { transcriptTranslateService } from './transcript-translate.service';
import { whisperRunner } from './whisper-runner';

async function persistTranscribeSuccess(
  session: { id: string },
  selectedClipId: string,
  engine: string,
  language: string,
  segments: SubtitleSegment[],
) {
  await prisma.directorClipTranscript.upsert({
    where: { selectedClipId },
    create: {
      sessionId: session.id,
      selectedClipId,
      status: 'COMPLETED',
      engine,
      language,
      segments: segments as object[],
      completedAt: new Date(),
    },
    update: {
      status: 'COMPLETED',
      engine,
      segments: segments as object[],
      language,
      errorMessage: null,
      completedAt: new Date(),
    },
  });
}

async function persistTranscribeFailure(
  session: { id: string },
  selectedClipId: string,
  engine: string,
  errorMsg: string,
) {
  await prisma.directorClipTranscript.upsert({
    where: { selectedClipId },
    create: {
      sessionId: session.id,
      selectedClipId,
      status: 'FAILED',
      engine,
      errorMessage: errorMsg,
    },
    update: {
      status: 'FAILED',
      engine,
      errorMessage: errorMsg,
      completedAt: new Date(),
    },
  });
}

type TranscribeSession = { id: string; transcribeJob?: { id: string; segments: unknown } | null };

function resolveTranscribeOptions(
  options: {
    language?: TranscribeLanguage;
    subtitleMode?: 'original' | 'translate';
    subtitleTargetLanguage?: TranscribeLanguage | null;
  } = {},
) {
  const targetLanguage = normalizeTranscribeLanguage(options.language, env.TRANSCRIBE_LANGUAGE);
  const subtitleMode = options.subtitleMode === 'translate' ? 'translate' : 'original';
  const subtitleTargetLanguage =
    subtitleMode === 'translate'
      ? normalizeTranscribeLanguage(options.subtitleTargetLanguage, 'en')
      : null;

  if (subtitleMode === 'translate' && isAutoTranscribeLanguage(subtitleTargetLanguage)) {
    throw new Error('Bahasa target terjemahan harus spesifik (contoh: "en", "es", "ja").');
  }

  return { targetLanguage, subtitleMode, subtitleTargetLanguage };
}

function resolveTranscribePaths(asset: { storageKey: string }) {
  const cleanStorageKey = asset.storageKey.replace(/^uploads\//, '');
  const inputPath = path.join(env.MEDIA_INPUT_DIR, cleanStorageKey);
  const audioProxyDir = path.join(env.TEMP_DIR, 'director/audio-proxies');
  return { inputPath, audioProxyDir, cleanStorageKey };
}

async function handleCacheHit(
  bypassCache: boolean | undefined,
  cacheKey: string,
  session: TranscribeSession,
  selectedClipId: string,
): Promise<boolean> {
  if (bypassCache) return false;

  const cachedTranscript = await transcribeCacheService.getCachedTranscript(cacheKey);
  if (!cachedTranscript) return false;

  await updateProgressMeta(session.transcribeJob?.id, session.transcribeJob?.segments, {
    phase: 'cache-hit',
    currentClipId: selectedClipId,
  });

  await persistTranscribeSuccess(
    session,
    selectedClipId,
    'WHISPER_CACHE',
    cachedTranscript.language ?? 'en',
    cachedTranscript.segments as SubtitleSegment[],
  );

  return true;
}

class TranscribePipelineError extends Error {
  transcriptEngine: string;
  originalError: unknown;

  constructor(originalError: unknown, transcriptEngine: string) {
    super(originalError instanceof Error ? originalError.message : String(originalError));
    this.name = 'TranscribePipelineError';
    this.transcriptEngine = transcriptEngine;
    this.originalError = originalError;
  }
}

interface TranscribePipelineOptions {
  inputPath: string;
  audioProxyDir: string;
  startMs: number;
  endMs: number;
  selectedClipId: string;
  targetLanguage: TranscribeLanguage;
  subtitleMode: 'original' | 'translate';
  subtitleTargetLanguage: TranscribeLanguage | null;
  session: TranscribeSession;
}

async function executeTranscribePipeline({
  inputPath,
  audioProxyDir,
  startMs,
  endMs,
  selectedClipId,
  targetLanguage,
  subtitleMode,
  subtitleTargetLanguage,
  session,
}: TranscribePipelineOptions) {
  let audioProxyPath = '';
  let transcriptEngine = 'WHISPER_LOCAL';

  try {
    await updateProgressMeta(session.transcribeJob?.id, session.transcribeJob?.segments, {
      phase: 'extracting-audio',
      currentClipId: selectedClipId,
    });

    audioProxyPath = await directorProcessor.extractClipAudioProxy(
      inputPath,
      audioProxyDir,
      startMs,
      endMs,
    );

    await updateProgressMeta(session.transcribeJob?.id, session.transcribeJob?.segments, {
      phase: 'running-whisper',
      currentClipId: selectedClipId,
    });

    const result = await whisperRunner.runWhisperOnAudio(audioProxyPath, targetLanguage);
    transcriptEngine = result.provider === 'http' ? 'WHISPER_HTTP' : 'WHISPER_LOCAL';

    if (!result.success || !result.segments) {
      throw new Error(result.error || 'Whisper returned no segments');
    }

    const normalizedSegments = await recoverMissingTailSegments({
      inputPath,
      audioProxyDir,
      clipStartMs: startMs,
      clipEndMs: endMs,
      selectedClipId,
      language: targetLanguage,
      segments: transcribeNormalizer.normalizeSegments(result.segments),
    });

    const finalLanguage =
      subtitleMode === 'translate'
        ? (subtitleTargetLanguage ?? DEFAULT_TRANSCRIBE_LANGUAGE)
        : result.language;

    let finalSegments = normalizedSegments;
    if (subtitleMode === 'translate' && subtitleTargetLanguage) {
      await updateProgressMeta(session.transcribeJob?.id, session.transcribeJob?.segments, {
        phase: 'translating-transcript',
        currentClipId: selectedClipId,
      });

      finalSegments = await transcriptTranslateService.translateSegments(
        normalizedSegments,
        subtitleTargetLanguage,
      );
    }

    await updateProgressMeta(session.transcribeJob?.id, session.transcribeJob?.segments, {
      phase: 'saving-transcript',
      currentClipId: selectedClipId,
    });

    return { finalSegments, finalLanguage, transcriptEngine };
  } catch (error) {
    throw new TranscribePipelineError(error, transcriptEngine);
  } finally {
    if (audioProxyPath) {
      await unlinkIfExists(audioProxyPath);
    }
  }
}

async function updateProgressMeta(
  transcribeJobId: string | undefined,
  currentSegments: unknown,
  patch: Parameters<typeof updateTranscribeProgressMeta>[1],
) {
  if (!transcribeJobId) {
    return;
  }

  await prisma.directorTranscribeJob.update({
    where: { id: transcribeJobId },
    data: {
      segments: toTranscribeProgressJson(
        updateTranscribeProgressMeta(parseTranscribeProgressMeta(currentSegments), patch),
      ),
    },
  });
}

async function unlinkIfExists(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
  } catch {
    // ignore cleanup failures
  }
}

async function recoverMissingTailSegments(params: {
  inputPath: string;
  audioProxyDir: string;
  clipStartMs: number;
  clipEndMs: number;
  selectedClipId: string;
  language: TranscribeLanguage;
  segments: SubtitleSegment[];
}): Promise<SubtitleSegment[]> {
  const clipDurationMs = Math.max(0, params.clipEndMs - params.clipStartMs);
  const recoveryWindow = getTranscriptTailRecoveryWindow(params.segments, clipDurationMs);
  if (!recoveryWindow) {
    return params.segments;
  }

  const tailStartMs = params.clipStartMs + recoveryWindow.startMs;
  let tailAudioProxyPath = '';

  try {
    tailAudioProxyPath = await directorProcessor.extractClipAudioProxy(
      params.inputPath,
      params.audioProxyDir,
      tailStartMs,
      params.clipEndMs,
    );
    const tailResult = await whisperRunner.runWhisperOnAudio(tailAudioProxyPath, params.language, {
      vadFilter: false,
    });

    if (!tailResult.success || !tailResult.segments?.length) {
      logger.warn(
        {
          selectedClipId: params.selectedClipId,
          tailStartMs,
          clipEndMs: params.clipEndMs,
          error: tailResult.error,
        },
        'Transcript tail recovery produced no segments',
      );
      return params.segments;
    }

    const normalizedTailSegments = transcribeNormalizer.normalizeSegments(tailResult.segments);
    const recoveredTailSegments = offsetRecoveredTailSegments(
      normalizedTailSegments,
      recoveryWindow,
    );

    if (recoveredTailSegments.length === 0) {
      return params.segments;
    }

    logger.info(
      {
        selectedClipId: params.selectedClipId,
        tailStartMs,
        recoveredSegmentCount: recoveredTailSegments.length,
      },
      'Recovered missing transcript tail segments',
    );

    return [...params.segments, ...recoveredTailSegments].sort((a, b) => a.startMs - b.startMs);
  } catch (error) {
    logger.warn(
      {
        selectedClipId: params.selectedClipId,
        tailStartMs,
        clipEndMs: params.clipEndMs,
        error,
      },
      'Transcript tail recovery failed',
    );
    return params.segments;
  } finally {
    if (tailAudioProxyPath) {
      await unlinkIfExists(tailAudioProxyPath);
    }
  }
}

interface TranscribeClipRangeForCacheOptions {
  inputPath: string;
  audioProxyDir: string;
  assetFingerprint: string;
  startMs: number;
  endMs: number;
  language?: TranscribeLanguage;
  bypassCache?: boolean;
}

interface TranscribeClipRangeForCacheResult {
  cacheKey: string;
  cacheHit: boolean;
  language?: string;
  segments: SubtitleSegment[];
}

function isSubtitleSegment(segment: unknown): segment is SubtitleSegment {
  return (
    typeof segment === 'object' &&
    segment !== null &&
    'startMs' in segment &&
    'endMs' in segment &&
    'text' in segment &&
    typeof segment.startMs === 'number' &&
    typeof segment.endMs === 'number' &&
    typeof segment.text === 'string'
  );
}

function parseCachedSubtitleSegments(segments: object[]): SubtitleSegment[] {
  return segments.filter(isSubtitleSegment).sort((left, right) => left.startMs - right.startMs);
}

async function transcribeRangeFromAudio(params: {
  inputPath: string;
  audioProxyDir: string;
  startMs: number;
  endMs: number;
  language: TranscribeLanguage;
}): Promise<{ language?: string; segments: SubtitleSegment[] }> {
  await fs.mkdir(params.audioProxyDir, { recursive: true });

  let audioProxyPath = '';
  try {
    audioProxyPath = await directorProcessor.extractClipAudioProxy(
      params.inputPath,
      params.audioProxyDir,
      params.startMs,
      params.endMs,
    );

    const result = await whisperRunner.runWhisperOnAudio(audioProxyPath, params.language);
    if (!result.success || !result.segments) {
      throw new Error(result.error || 'Whisper returned no segments');
    }

    return {
      language: result.language,
      segments: transcribeNormalizer.normalizeSegments(result.segments),
    };
  } finally {
    if (audioProxyPath) {
      await unlinkIfExists(audioProxyPath);
    }
  }
}

export const transcribeService = {
  async transcribeClipRangeForCache(
    options: TranscribeClipRangeForCacheOptions,
  ): Promise<TranscribeClipRangeForCacheResult> {
    const targetLanguage = normalizeTranscribeLanguage(options.language, env.TRANSCRIBE_LANGUAGE);
    const cacheKey = transcribeCacheService.buildFingerprint({
      assetFingerprint: options.assetFingerprint,
      startMs: options.startMs,
      endMs: options.endMs,
      trimStartMs: 0,
      trimEndMs: 0,
      language: targetLanguage,
      subtitleMode: 'original',
      subtitleTargetLanguage: null,
    });

    if (!options.bypassCache) {
      const cachedTranscript = await transcribeCacheService.getCachedTranscript(cacheKey);
      if (cachedTranscript) {
        return {
          cacheKey,
          cacheHit: true,
          language: cachedTranscript.language,
          segments: parseCachedSubtitleSegments(cachedTranscript.segments),
        };
      }
    }

    const transcribed = await transcribeRangeFromAudio({
      inputPath: options.inputPath,
      audioProxyDir: options.audioProxyDir,
      startMs: options.startMs,
      endMs: options.endMs,
      language: targetLanguage,
    });

    await transcribeCacheService.setCachedTranscript(cacheKey, {
      language: transcribed.language,
      segments: transcribed.segments,
    });

    return {
      cacheKey,
      cacheHit: false,
      language: transcribed.language,
      segments: transcribed.segments,
    };
  },

  async cacheTranscriptRange(options: {
    assetFingerprint: string;
    startMs: number;
    endMs: number;
    language?: TranscribeLanguage | string;
    segments: SubtitleSegment[];
  }): Promise<string> {
    const targetLanguage = normalizeTranscribeLanguage(options.language, env.TRANSCRIBE_LANGUAGE);
    const cacheKey = transcribeCacheService.buildFingerprint({
      assetFingerprint: options.assetFingerprint,
      startMs: options.startMs,
      endMs: options.endMs,
      trimStartMs: 0,
      trimEndMs: 0,
      language: targetLanguage,
      subtitleMode: 'original',
      subtitleTargetLanguage: null,
    });

    await transcribeCacheService.setCachedTranscript(cacheKey, {
      language: targetLanguage,
      segments: options.segments,
    });

    return cacheKey;
  },

  /**
   * Orchestrate transcription for a single selected clip:
   * 1. Extract audio proxy
   * 2. Run Whisper
   * 3. Normalize segments
   * 4. Update DB
   */
  async transcribeSelectedClip(
    selectedClipId: string,
    options: {
      bypassCache?: boolean;
      language?: TranscribeLanguage;
      subtitleMode?: 'original' | 'translate';
      subtitleTargetLanguage?: TranscribeLanguage | null;
    } = {},
  ): Promise<void> {
    const selectedClip = await prisma.directorSelectedClip.findUnique({
      where: { id: selectedClipId },
      include: {
        session: { include: { asset: true, transcribeJob: true } },
        candidate: true,
      },
    });

    if (!selectedClip?.session) {
      throw new Error('Selected clip or asset not found');
    }

    const { session, candidate, trimStartMs, trimEndMs } = selectedClip;
    const asset = session.asset;
    if (!asset) {
      throw new Error('Selected clip or asset not found');
    }

    const { targetLanguage, subtitleMode, subtitleTargetLanguage } =
      resolveTranscribeOptions(options);

    const { startMs, endMs } = resolveSelectedClipRangeMs({
      candidateStartMs: candidate.startMs,
      candidateEndMs: candidate.endMs,
      trimStartMs,
      trimEndMs,
    });

    const { inputPath, audioProxyDir, cleanStorageKey } = resolveTranscribePaths(asset);

    // Debug logging
    logger.info(
      {
        selectedClipId,
        storageKey: asset.storageKey,
        cleanStorageKey,
        inputPath,
        audioProxyDir,
        mediaInputDir: env.MEDIA_INPUT_DIR,
        tempDir: env.TEMP_DIR,
      },
      'Transcribe: Resolving paths',
    );

    const assetFingerprint = asset.contentHash ?? asset.sourceUrlNormalized ?? asset.storageKey;
    const cacheKey = transcribeCacheService.buildFingerprint({
      assetFingerprint,
      startMs,
      endMs,
      trimStartMs,
      trimEndMs,
      language: targetLanguage,
      subtitleMode: subtitleMode as 'original' | 'translate',
      subtitleTargetLanguage,
    });

    await fs.mkdir(audioProxyDir, { recursive: true });

    let transcriptEngine = 'WHISPER_LOCAL';

    try {
      if (await handleCacheHit(options.bypassCache, cacheKey, session, selectedClipId)) {
        return;
      }

      const {
        finalSegments,
        finalLanguage,
        transcriptEngine: usedEngine,
      } = await executeTranscribePipeline({
        inputPath,
        audioProxyDir,
        startMs,
        endMs,
        selectedClipId,
        targetLanguage,
        subtitleMode: subtitleMode as 'original' | 'translate',
        subtitleTargetLanguage,
        session,
      });

      transcriptEngine = usedEngine;

      // 4. Persist to DB
      await persistTranscribeSuccess(
        session,
        selectedClipId,
        transcriptEngine,
        finalLanguage ?? 'en',
        finalSegments,
      );

      await transcribeCacheService.setCachedTranscript(cacheKey, {
        language: finalLanguage,
        segments: finalSegments,
      });

      logger.info(
        {
          selectedClipId,
          segCount: finalSegments.length,
          subtitleMode,
          subtitleTargetLanguage,
        },
        'Clip transcription completed',
      );
    } catch (err) {
      let actualError: unknown = err;
      if (err instanceof TranscribePipelineError) {
        actualError = err.originalError;
        transcriptEngine = err.transcriptEngine;
      }

      const errorMsg = actualError instanceof Error ? actualError.message : 'Unknown error';
      logger.error({ selectedClipId, err: actualError }, 'Clip transcription failed');

      // Update DB to FAILED
      await persistTranscribeFailure(session, selectedClipId, transcriptEngine, errorMsg);

      throw actualError; // Re-throw to fail the worker job (allowing retry)
    }
  },
};
