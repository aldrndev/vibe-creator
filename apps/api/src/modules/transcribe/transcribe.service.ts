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

export const transcribeService = {
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

    const { storageKey, contentHash, sourceUrlNormalized } = asset;
    const targetLanguage = normalizeTranscribeLanguage(options.language, env.TRANSCRIBE_LANGUAGE);
    const subtitleMode = options.subtitleMode === 'translate' ? 'translate' : 'original';
    const subtitleTargetLanguage =
      subtitleMode === 'translate'
        ? normalizeTranscribeLanguage(options.subtitleTargetLanguage, 'en')
        : null;

    if (subtitleMode === 'translate' && isAutoTranscribeLanguage(subtitleTargetLanguage)) {
      throw new Error('Bahasa target terjemahan harus spesifik (contoh: "en", "es", "ja").');
    }
    const { startMs, endMs } = resolveSelectedClipRangeMs({
      candidateStartMs: candidate.startMs,
      candidateEndMs: candidate.endMs,
      trimStartMs,
      trimEndMs,
    });

    // Fix: Resolve input path correctly using MEDIA_INPUT_DIR
    // storageKey might be 'uploads/director/xyz.mp4' or 'director/xyz.mp4'
    // We want: MEDIA_INPUT_DIR/director/xyz.mp4 (assuming MEDIA_INPUT_DIR is /app/uploads)
    const cleanStorageKey = storageKey.replace(/^uploads\//, ''); // Strip leading 'uploads/' if present
    const inputPath = path.join(env.MEDIA_INPUT_DIR, cleanStorageKey);
    const audioProxyDir = path.join(env.TEMP_DIR, 'director/audio-proxies');

    // Debug logging
    logger.info(
      {
        selectedClipId,
        storageKey,
        cleanStorageKey,
        inputPath,
        audioProxyDir,
        mediaInputDir: env.MEDIA_INPUT_DIR,
        tempDir: env.TEMP_DIR,
      },
      'Transcribe: Resolving paths',
    );

    const assetFingerprint = contentHash ?? sourceUrlNormalized ?? storageKey;
    const cacheKey = transcribeCacheService.buildFingerprint({
      assetFingerprint,
      startMs,
      endMs,
      trimStartMs,
      trimEndMs,
      language: targetLanguage,
      subtitleMode,
      subtitleTargetLanguage,
    });

    // Ensure proxy dir exists
    await fs.mkdir(audioProxyDir, { recursive: true });

    let audioProxyPath = '';
    let transcriptEngine = 'WHISPER_LOCAL';

    try {
      if (!options.bypassCache) {
        const cachedTranscript = await transcribeCacheService.getCachedTranscript(cacheKey);
        if (cachedTranscript) {
          await updateProgressMeta(session.transcribeJob?.id, session.transcribeJob?.segments, {
            phase: 'cache-hit',
            currentClipId: selectedClipId,
          });

          await prisma.directorClipTranscript.upsert({
            where: { selectedClipId },
            create: {
              sessionId: session.id,
              selectedClipId,
              status: 'COMPLETED',
              engine: 'WHISPER_CACHE',
              language: cachedTranscript.language,
              segments: cachedTranscript.segments,
              completedAt: new Date(),
            },
            update: {
              status: 'COMPLETED',
              engine: 'WHISPER_CACHE',
              segments: cachedTranscript.segments,
              language: cachedTranscript.language,
              errorMessage: null,
              completedAt: new Date(),
            },
          });
          return;
        }
      }

      await updateProgressMeta(session.transcribeJob?.id, session.transcribeJob?.segments, {
        phase: 'extracting-audio',
        currentClipId: selectedClipId,
      });

      // 1. Extract Audio
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

      // 2. Run Whisper
      const result = await whisperRunner.runWhisperOnAudio(audioProxyPath, targetLanguage);
      transcriptEngine = result.provider === 'http' ? 'WHISPER_HTTP' : 'WHISPER_LOCAL';

      if (!result.success || !result.segments) {
        throw new Error(result.error || 'Whisper returned no segments');
      }

      // 3. Normalize
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
      const finalSegments =
        subtitleMode === 'translate' && subtitleTargetLanguage
          ? await (async () => {
              await updateProgressMeta(session.transcribeJob?.id, session.transcribeJob?.segments, {
                phase: 'translating-transcript',
                currentClipId: selectedClipId,
              });

              return transcriptTranslateService.translateSegments(
                normalizedSegments,
                subtitleTargetLanguage,
              );
            })()
          : normalizedSegments;

      await updateProgressMeta(session.transcribeJob?.id, session.transcribeJob?.segments, {
        phase: 'saving-transcript',
        currentClipId: selectedClipId,
      });

      // 4. Persist to DB
      await prisma.directorClipTranscript.upsert({
        where: { selectedClipId },
        create: {
          sessionId: session.id,
          selectedClipId,
          status: 'COMPLETED',
          engine: transcriptEngine,
          language: finalLanguage,
          segments: finalSegments as object[],
          completedAt: new Date(),
        },
        update: {
          status: 'COMPLETED',
          engine: transcriptEngine,
          segments: finalSegments as object[],
          language: finalLanguage,
          errorMessage: null,
          completedAt: new Date(),
        },
      });

      await transcribeCacheService.setCachedTranscript(cacheKey, {
        language: finalLanguage,
        segments: finalSegments as object[],
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
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      logger.error({ selectedClipId, err }, 'Clip transcription failed');

      // Update DB to FAILED
      await prisma.directorClipTranscript.upsert({
        where: { selectedClipId },
        create: {
          sessionId: session.id,
          selectedClipId,
          status: 'FAILED',
          engine: transcriptEngine,
          errorMessage: errorMsg,
        },
        update: {
          status: 'FAILED',
          engine: transcriptEngine,
          errorMessage: errorMsg,
          completedAt: new Date(), // Mark as done (failed)
        },
      });

      throw err; // Re-throw to fail the worker job (allowing retry)
    } finally {
      // Cleanup temp audio
      if (audioProxyPath) {
        await unlinkIfExists(audioProxyPath);
      }
    }
  },
};
