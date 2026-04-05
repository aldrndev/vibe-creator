import { env } from '@/config/env';
import { logger } from '@/lib/logger';
import { type DirectorSessionWithDetails, directorRepo } from '../director.repo';
import { buildFallbackPublishCopy, sanitizePublishCopy } from './publish-copy.fallback';

const OPENAI_COPY_MODEL = 'gpt-4.1-mini';
const OLLAMA_REQUEST_TIMEOUT_MS = 60_000;
const OPENAI_REQUEST_TIMEOUT_MS = 20000;
const DIRECTOR_PUBLISH_COPY_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'caption', 'cta', 'hashtags'],
  properties: {
    title: { type: 'string' },
    caption: { type: 'string' },
    cta: { type: 'string' },
    hashtags: {
      type: 'array',
      items: { type: 'string' },
      minItems: 2,
      maxItems: 6,
    },
  },
} as const;

interface OpenAIPublishCopyResponse {
  title: string;
  caption: string;
  cta: string;
  hashtags: string[];
}

interface OllamaChatResponse {
  message?: {
    content?: string;
  };
}

interface TranscriptTextSegment {
  text: string;
}

interface PublishCopyPromptContext {
  readonly transcriptText: string;
  readonly fallbackTitle: string;
  readonly durationSeconds: number;
  readonly tags: string[];
  readonly angle: string;
  readonly contentMode: string;
  readonly topSignals: string[];
  readonly hookScore: number | null;
  readonly viralScore: number | null;
  readonly clarityScore: number | null;
  readonly recommendationReason: string | null;
}

type PublishCopyProvider = 'openai' | 'ollama';

function buildPrompt(context: PublishCopyPromptContext) {
  return [
    'Buat copy publish berbahasa Indonesia untuk video Shorts yang terasa tajam, natural, dan siap posting.',
    'Tugasmu bukan menyalin transkrip. Gunakan transkrip hanya sebagai bahan mentah untuk menemukan angle dan hook.',
    'Hindari template generik, kalimat filler, dan pengulangan kata yang terlalu literal dari ucapan video.',
    'Judul harus terasa scroll-stopping, ringkas, dan punya sudut pandang yang jelas.',
    'Caption harus 2-3 kalimat yang menjual inti klip, bukan transkrip mentah.',
    'CTA harus spesifik dan relevan dengan angle klip, bukan CTA template umum.',
    'Output wajib dalam JSON sesuai schema.',
    `Judul fallback saat ini: ${context.fallbackTitle}`,
    `Durasi klip: ${context.durationSeconds} detik`,
    `Angle konten: ${context.angle}`,
    `Mode konten: ${context.contentMode}`,
    `Tag kandidat: ${context.tags.join(', ') || 'tidak ada'}`,
    `Sinyal terkuat: ${context.topSignals.join(', ') || 'tidak ada'}`,
    `AI score -> viral: ${context.viralScore ?? 'n/a'}, hook: ${context.hookScore ?? 'n/a'}, clarity: ${context.clarityScore ?? 'n/a'}`,
    `Alasan rekomendasi: ${context.recommendationReason ?? 'tidak ada'}`,
    `Transkrip klip terbaik: ${context.transcriptText || 'Tidak ada transkrip, gunakan angle umum yang aman.'}`,
  ].join('\n');
}

function getPreferredProviders(): PublishCopyProvider[] {
  if (env.AI_COPY_PROVIDER === 'ollama') {
    return ['ollama'];
  }

  if (env.AI_COPY_PROVIDER === 'auto') {
    return ['ollama', 'openai'];
  }

  return ['openai'];
}

function extractOutputText(payload: unknown): string | null {
  if (
    typeof payload === 'object' &&
    payload !== null &&
    'output_text' in payload &&
    typeof payload.output_text === 'string'
  ) {
    return payload.output_text;
  }

  return null;
}

function extractOllamaMessage(payload: unknown): string | null {
  if (
    typeof payload === 'object' &&
    payload !== null &&
    'message' in payload &&
    typeof payload.message === 'object' &&
    payload.message !== null &&
    'content' in payload.message &&
    typeof payload.message.content === 'string'
  ) {
    return payload.message.content;
  }

  return null;
}

function extractTranscriptText(segments: unknown): string {
  if (!Array.isArray(segments)) {
    return '';
  }

  return segments
    .map((segment): TranscriptTextSegment | null => {
      if (
        typeof segment === 'object' &&
        segment !== null &&
        'text' in segment &&
        typeof segment.text === 'string'
      ) {
        return { text: segment.text.trim() };
      }

      return null;
    })
    .filter((segment): segment is TranscriptTextSegment => segment !== null)
    .map((segment) => segment.text)
    .filter(Boolean)
    .join(' ');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === 'string');
}

function readNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function buildPromptContext(
  bestClip: DirectorSessionWithDetails['selectedClips'][number],
  transcriptText: string,
  fallbackTitle: string,
): PublishCopyPromptContext {
  const candidateMetadata = isRecord(bestClip.candidate.metadata)
    ? bestClip.candidate.metadata
    : null;
  const scoreBreakdown =
    candidateMetadata && isRecord(candidateMetadata.scoreBreakdown)
      ? candidateMetadata.scoreBreakdown
      : null;
  const aiRerank =
    candidateMetadata && isRecord(candidateMetadata.aiRerank) ? candidateMetadata.aiRerank : null;
  const durationSeconds = Math.max(
    1,
    Math.round((bestClip.candidate.endMs - bestClip.candidate.startMs) / 1000),
  );

  return {
    transcriptText,
    fallbackTitle,
    durationSeconds,
    tags: readStringArray(bestClip.candidate.tags),
    angle: readString(scoreBreakdown?.contentModeSuggestion) ?? 'short-form general',
    contentMode: readString(scoreBreakdown?.contentModeSuggestion) ?? 'auto',
    topSignals: readStringArray(scoreBreakdown?.topSignals),
    hookScore: readNumber(aiRerank?.hookScore),
    viralScore: readNumber(aiRerank?.viralScore),
    clarityScore: readNumber(aiRerank?.clarityScore),
    recommendationReason: readString(aiRerank?.reason),
  };
}

async function requestOpenAIPublishCopy(
  context: PublishCopyPromptContext,
): Promise<OpenAIPublishCopyResponse | null> {
  if (!env.OPENAI_API_KEY) {
    return null;
  }

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_COPY_MODEL,
      input: [
        {
          role: 'system',
          content: [
            {
              type: 'input_text',
              text: 'You are a viral short-form content strategist. Return clean Indonesian copy only as JSON.',
            },
          ],
        },
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: buildPrompt(context),
            },
          ],
        },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'director_publish_copy',
          strict: true,
          schema: DIRECTOR_PUBLISH_COPY_SCHEMA,
        },
      },
    }),
    signal: AbortSignal.timeout(OPENAI_REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`OpenAI publish copy request failed: ${response.status}`);
  }

  const payload = (await response.json()) as unknown;
  const outputText = extractOutputText(payload);
  if (!outputText) {
    throw new Error('OpenAI publish copy response missing output_text');
  }

  return JSON.parse(outputText) as OpenAIPublishCopyResponse;
}

const OLLAMA_HEALTH_CHECK_TIMEOUT_MS = 5_000;

async function isOllamaReachable(): Promise<boolean> {
  if (!env.OLLAMA_BASE_URL) {
    return false;
  }

  try {
    const response = await fetch(`${env.OLLAMA_BASE_URL}/tags`, {
      method: 'GET',
      signal: AbortSignal.timeout(OLLAMA_HEALTH_CHECK_TIMEOUT_MS),
    });

    return response.ok;
  } catch {
    return false;
  }
}

async function requestOllamaPublishCopy(
  context: PublishCopyPromptContext,
): Promise<OpenAIPublishCopyResponse | null> {
  if (!env.OLLAMA_BASE_URL) {
    return null;
  }

  const isHealthy = await isOllamaReachable();
  if (!isHealthy) {
    throw new Error('Ollama service tidak aktif atau tidak bisa dihubungi');
  }

  const response = await fetch(`${env.OLLAMA_BASE_URL}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: env.OLLAMA_MODEL,
      stream: false,
      keep_alive: 0,
      format: DIRECTOR_PUBLISH_COPY_SCHEMA,
      messages: [
        {
          role: 'system',
          content:
            'Kamu adalah strategist short-form content untuk creator Indonesia. Balas hanya JSON valid sesuai schema.',
        },
        {
          role: 'user',
          content: buildPrompt(context),
        },
      ],
    }),
    signal: AbortSignal.timeout(OLLAMA_REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Ollama publish copy request failed: ${response.status}`);
  }

  const payload = (await response.json()) as OllamaChatResponse;
  const outputText = extractOllamaMessage(payload);
  if (!outputText) {
    throw new Error('Ollama publish copy response missing message content');
  }

  return JSON.parse(outputText) as OpenAIPublishCopyResponse;
}

export const directorPublishCopyService = {
  async getPublishCopy(sessionId: string, userId: string) {
    const session = await directorRepo.findSession(sessionId, userId);
    if (!session) {
      throw new Error('Session not found');
    }

    const fallbackPack = buildFallbackPublishCopy(session);
    if (!fallbackPack.bestClipId) {
      return fallbackPack;
    }

    const transcriptText = extractTranscriptText(
      session.selectedClips.find((clip) => clip.id === fallbackPack.bestClipId)?.transcript
        ?.segments,
    );
    const bestClip = session.selectedClips.find((clip) => clip.id === fallbackPack.bestClipId);
    if (!bestClip) {
      return fallbackPack;
    }

    const promptContext = buildPromptContext(bestClip, transcriptText, fallbackPack.title);
    const attemptedProviders: PublishCopyProvider[] = [];
    let lastProviderError: string | null = null;
    for (const provider of getPreferredProviders()) {
      try {
        attemptedProviders.push(provider);
        const aiCopy =
          provider === 'ollama'
            ? await requestOllamaPublishCopy(promptContext)
            : await requestOpenAIPublishCopy(promptContext);

        if (!aiCopy) {
          continue;
        }

        return sanitizePublishCopy({
          bestClipId: fallbackPack.bestClipId,
          title: aiCopy.title,
          caption: aiCopy.caption,
          cta: aiCopy.cta,
          hashtags: aiCopy.hashtags,
          source: 'ai',
          provider,
          notice: {
            mode: 'ai',
            message: `Copy publish dihasilkan via ${provider === 'ollama' ? 'Ollama' : 'OpenAI'}.`,
            attemptedProviders,
          },
        });
      } catch (error) {
        lastProviderError = error instanceof Error ? error.message : String(error);
        logger.warn(
          {
            sessionId,
            provider,
            error: lastProviderError,
          },
          'Falling back to next publish copy provider',
        );
      }
    }

    return sanitizePublishCopy({
      ...fallbackPack,
      notice: {
        mode: 'fallback',
        message: 'AI copy belum berhasil, jadi sistem memakai fallback heuristik sementara.',
        attemptedProviders,
        lastError: lastProviderError,
      },
    });
  },
};
