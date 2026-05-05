import { createHash } from 'node:crypto';
import { env } from '@/config/env';
import { redis } from '@/lib/redis';
import type { TranscribeLanguage } from './transcribe-language';

const TRANSCRIBE_CACHE_TTL_SECONDS = 7 * 24 * 60 * 60;
const TRANSCRIBE_CACHE_QUALITY_VERSION = 2;

export interface CachedTranscriptPayload {
  language?: string;
  segments: object[];
}

interface ClipFingerprintInput {
  assetFingerprint: string;
  startMs: number;
  endMs: number;
  trimStartMs: number;
  trimEndMs: number;
  language: TranscribeLanguage;
  subtitleMode?: 'original' | 'translate';
  subtitleTargetLanguage?: string | null;
}

function buildCacheKey(input: ClipFingerprintInput): string {
  const fingerprint = createHash('sha256')
    .update(
      JSON.stringify({
        assetFingerprint: input.assetFingerprint,
        startMs: input.startMs,
        endMs: input.endMs,
        trimStartMs: input.trimStartMs,
        trimEndMs: input.trimEndMs,
        language: input.language,
        subtitleMode: input.subtitleMode ?? 'original',
        subtitleTargetLanguage: input.subtitleTargetLanguage ?? null,
        qualityVersion: TRANSCRIBE_CACHE_QUALITY_VERSION,
        whisperModelSize: env.WHISPER_MODEL_SIZE,
        transcribeProvider: env.TRANSCRIBE_PROVIDER,
        transcribeServiceUrl: env.TRANSCRIBE_SERVICE_URL ?? null,
        vadThreshold: env.TRANSCRIBE_VAD_THRESHOLD,
        vadSpeechPadMs: env.TRANSCRIBE_VAD_SPEECH_PAD_MS,
        vadMinSilenceMs: env.TRANSCRIBE_VAD_MIN_SILENCE_MS,
        vadMinSpeechMs: env.TRANSCRIBE_VAD_MIN_SPEECH_MS,
      }),
    )
    .digest('hex');

  return `director:transcribe-cache:${fingerprint}`;
}

export const transcribeCacheService = {
  buildFingerprint(input: ClipFingerprintInput): string {
    return buildCacheKey(input);
  },

  async getCachedTranscript(cacheKey: string): Promise<CachedTranscriptPayload | null> {
    if (redis.status !== 'ready') {
      return null;
    }

    const cached = await redis.get(cacheKey);
    if (!cached) {
      return null;
    }

    const payload = JSON.parse(cached) as CachedTranscriptPayload;
    if (!Array.isArray(payload.segments)) {
      return null;
    }

    return payload;
  },

  async setCachedTranscript(cacheKey: string, payload: CachedTranscriptPayload): Promise<void> {
    if (redis.status !== 'ready') {
      return;
    }

    await redis.set(cacheKey, JSON.stringify(payload), 'EX', TRANSCRIBE_CACHE_TTL_SECONDS);
  },
};
