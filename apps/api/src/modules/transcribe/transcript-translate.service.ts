import { env } from '@/config/env';
import { logger } from '@/lib/logger';
import type { SubtitleSegment } from './transcribe-normalizer';

const OPENAI_TRANSLATE_MODEL = 'gpt-4.1-mini';
const OPENAI_REQUEST_TIMEOUT_MS = 20_000;
const OLLAMA_REQUEST_TIMEOUT_MS = 120_000;
/** Keep model loaded in Ollama for 5 minutes to avoid cold-start on sequential pipeline calls. */
const OLLAMA_KEEP_ALIVE_SECONDS = 300;
const TRANSLATION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['translations'],
  properties: {
    translations: {
      type: 'array',
      items: { type: 'string' },
    },
  },
} as const;

interface OpenAITranslationResponse {
  translations: string[];
}

interface OllamaChatResponse {
  message?: {
    content?: string;
  };
}

type TranslationProvider = 'openai' | 'ollama';

function getPreferredProviders(): TranslationProvider[] {
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

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
}

function sanitizeTranslations(
  translations: unknown,
  expectedCount: number,
): OpenAITranslationResponse | null {
  if (!isStringArray(translations)) {
    return null;
  }

  if (translations.length !== expectedCount) {
    return null;
  }

  const normalizedTranslations = translations.map((entry) => entry.trim());
  if (normalizedTranslations.some((entry) => entry.length === 0)) {
    return null;
  }

  return { translations: normalizedTranslations };
}

function buildTranslatePrompt(targetLanguage: string, segments: SubtitleSegment[]): string {
  return [
    `Terjemahkan setiap segmen subtitle ke bahasa target "${targetLanguage}".`,
    'Aturan penting:',
    '- Jangan ubah urutan segmen.',
    '- Jumlah output harus sama persis dengan jumlah input.',
    '- Jangan tambahkan penjelasan, hanya JSON valid sesuai schema.',
    '- Pertahankan tone percakapan natural dan singkat untuk subtitle video short.',
    `Input segments JSON: ${JSON.stringify(segments.map((segment) => ({ text: segment.text })))}`,
  ].join('\n');
}

async function requestOpenAITranslation(
  targetLanguage: string,
  segments: SubtitleSegment[],
): Promise<OpenAITranslationResponse | null> {
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
      model: OPENAI_TRANSLATE_MODEL,
      input: [
        {
          role: 'system',
          content: [
            {
              type: 'input_text',
              text: 'You are a subtitle localization expert. Return JSON only.',
            },
          ],
        },
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: buildTranslatePrompt(targetLanguage, segments),
            },
          ],
        },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'subtitle_translation',
          strict: true,
          schema: TRANSLATION_SCHEMA,
        },
      },
    }),
    signal: AbortSignal.timeout(OPENAI_REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`OpenAI subtitle translation failed: ${response.status}`);
  }

  const payload = await response.json();
  const outputText = extractOutputText(payload);
  if (!outputText) {
    throw new Error('OpenAI subtitle translation missing output_text');
  }

  const parsed = JSON.parse(outputText) as { translations?: unknown };
  return sanitizeTranslations(parsed.translations, segments.length);
}

async function requestOllamaTranslation(
  targetLanguage: string,
  segments: SubtitleSegment[],
): Promise<OpenAITranslationResponse | null> {
  if (!env.OLLAMA_BASE_URL) {
    return null;
  }

  const startTime = Date.now();

  const response = await fetch(`${env.OLLAMA_BASE_URL}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: env.OLLAMA_MODEL,
      stream: false,
      keep_alive: OLLAMA_KEEP_ALIVE_SECONDS,
      format: TRANSLATION_SCHEMA,
      messages: [
        {
          role: 'system',
          content:
            'Kamu adalah localization specialist subtitle. Balas hanya JSON valid sesuai schema.',
        },
        {
          role: 'user',
          content: buildTranslatePrompt(targetLanguage, segments),
        },
      ],
    }),
    signal: AbortSignal.timeout(OLLAMA_REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Ollama subtitle translation failed: ${response.status}`);
  }

  const payload = (await response.json()) as OllamaChatResponse;
  const elapsedMs = Date.now() - startTime;
  logger.info(
    { elapsedMs, targetLanguage, segmentCount: segments.length },
    'Ollama subtitle translation completed',
  );

  const outputText = extractOllamaMessage(payload);
  if (!outputText) {
    throw new Error('Ollama subtitle translation missing message content');
  }

  const parsed = JSON.parse(outputText) as { translations?: unknown };
  return sanitizeTranslations(parsed.translations, segments.length);
}

function applyTranslations(
  segments: SubtitleSegment[],
  translation: OpenAITranslationResponse,
): SubtitleSegment[] {
  return segments.map((segment, index) => ({
    ...segment,
    text: translation.translations[index] ?? segment.text,
    words: undefined,
  }));
}

export const transcriptTranslateService = {
  async translateSegments(
    segments: SubtitleSegment[],
    targetLanguage: string,
  ): Promise<SubtitleSegment[]> {
    if (segments.length === 0) {
      return [];
    }

    const providers = getPreferredProviders();
    const errors: string[] = [];

    for (const provider of providers) {
      try {
        const result =
          provider === 'ollama'
            ? await requestOllamaTranslation(targetLanguage, segments)
            : await requestOpenAITranslation(targetLanguage, segments);

        if (!result) {
          continue;
        }

        return applyTranslations(segments, result);
      } catch (error) {
        const reason = error instanceof Error ? error.message : 'Unknown translation error';
        errors.push(`${provider}: ${reason}`);
        logger.warn({ provider, reason, targetLanguage }, 'Subtitle translation provider failed');
      }
    }

    throw new Error(
      `Subtitle translation failed for target "${targetLanguage}". ${errors.join(' | ')}`,
    );
  },
};
