import fs from 'node:fs/promises';
import path from 'node:path';
import { env } from '@/config/env';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { directorProcessor } from '../director/director.processor';
import { resolveSelectedClipRangeMs } from '../director/selected-clip-range';
import {
  parseTranscribeProgressMeta,
  toTranscribeProgressJson,
  updateTranscribeProgressMeta,
} from '../director/services/transcribe-progress';
import { transcribeCacheService } from './transcribe-cache.service';
import { transcribeNormalizer } from './transcribe-normalizer';
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
    options: { bypassCache?: boolean } = {},
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
    });

    // Ensure proxy dir exists
    await fs.mkdir(audioProxyDir, { recursive: true });

    let audioProxyPath = '';

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
      const result = await whisperRunner.runWhisperOnAudio(audioProxyPath);

      if (!result.success || !result.segments) {
        throw new Error(result.error || 'Whisper returned no segments');
      }

      // 3. Normalize
      const normalizedSegments = transcribeNormalizer.normalizeSegments(result.segments);

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
          engine: 'WHISPER_LOCAL',
          language: result.language,
          segments: normalizedSegments as object[],
          completedAt: new Date(),
        },
        update: {
          status: 'COMPLETED',
          segments: normalizedSegments as object[],
          language: result.language,
          errorMessage: null,
          completedAt: new Date(),
        },
      });

      await transcribeCacheService.setCachedTranscript(cacheKey, {
        language: result.language,
        segments: normalizedSegments as object[],
      });

      logger.info(
        { selectedClipId, segCount: normalizedSegments.length },
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
          engine: 'WHISPER_LOCAL',
          errorMessage: errorMsg,
        },
        update: {
          status: 'FAILED',
          errorMessage: errorMsg,
          completedAt: new Date(), // Mark as done (failed)
        },
      });

      throw err; // Re-throw to fail the worker job (allowing retry)
    } finally {
      // Cleanup temp audio
      if (audioProxyPath) {
        try {
          await fs.unlink(audioProxyPath);
        } catch {
          // ignore
        }
      }
    }
  },
};
