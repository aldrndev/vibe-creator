import { z } from 'zod';
import { env } from '@/config/env';

const OPENAI_RERANK_MODEL = 'gpt-4.1-mini';
/** Keep model loaded in Ollama for 5 minutes to avoid cold-start on sequential pipeline calls. */
const OLLAMA_KEEP_ALIVE_SECONDS = 300;

const analysisAiCandidateSchema = z.object({
  index: z.number().int().min(0),
  label: z.string().min(3).max(40),
  reason: z.string().min(12).max(180),
  viralScore: z.number().min(0).max(100),
  hookScore: z.number().min(0).max(100),
  clarityScore: z.number().min(0).max(100),
});

const analysisAiResponseSchema = z.object({
  candidates: z.array(analysisAiCandidateSchema),
});

const analysisAiResponseJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['candidates'],
  properties: {
    candidates: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['index', 'label', 'reason', 'viralScore', 'hookScore', 'clarityScore'],
        properties: {
          index: { type: 'integer', minimum: 0 },
          label: { type: 'string', minLength: 3, maxLength: 40 },
          reason: { type: 'string', minLength: 12, maxLength: 180 },
          viralScore: { type: 'number', minimum: 0, maximum: 100 },
          hookScore: { type: 'number', minimum: 0, maximum: 100 },
          clarityScore: { type: 'number', minimum: 0, maximum: 100 },
        },
      },
    },
  },
} as const;

export type AnalysisAiProvider = 'openai' | 'ollama' | 'heuristic';

export interface AnalysisAiPromptCandidate {
  durationSeconds: number;
  heuristicScore: number;
  rank: number;
  tags: string[];
  energy: number;
  dialogDensity: number;
  durationFit: number;
  visualPenalty: number;
  completionScore?: number;
  standaloneScore?: number;
  reasonLabels?: string[];
}

export interface AnalysisAiRating {
  index: number;
  label: string;
  reason: string;
  viralScore: number;
  hookScore: number;
  clarityScore: number;
}

function getPreferredProviders(): AnalysisAiProvider[] {
  if (env.AI_COPY_PROVIDER === 'ollama') {
    return env.DIRECTOR_LOCAL_RERANK_ENABLED ? ['ollama'] : [];
  }

  if (env.AI_COPY_PROVIDER === 'auto') {
    return env.DIRECTOR_LOCAL_RERANK_ENABLED ? ['ollama', 'openai'] : ['openai'];
  }

  return ['openai'];
}

function buildCandidateSummary(candidates: AnalysisAiPromptCandidate[]): string {
  return candidates
    .map((candidate, index) => {
      const tagText = candidate.tags.length > 0 ? candidate.tags.join(', ') : 'highlight';
      return [
        `Kandidat #${index}`,
        `- durationSeconds: ${candidate.durationSeconds}`,
        `- heuristicScore: ${candidate.heuristicScore}`,
        `- currentRank: ${candidate.rank}`,
        `- tags: ${tagText}`,
        `- energyScore: ${candidate.energy}`,
        `- dialogDensityScore: ${candidate.dialogDensity}`,
        `- durationFitScore: ${candidate.durationFit}`,
        `- visualPenalty: ${candidate.visualPenalty}`,
        `- completionScore: ${candidate.completionScore ?? 'unknown'}`,
        `- standaloneScore: ${candidate.standaloneScore ?? 'unknown'}`,
        `- reasonLabels: ${candidate.reasonLabels?.join(', ') ?? 'unknown'}`,
      ].join('\n');
    })
    .join('\n\n');
}

function buildRerankPrompt(candidates: AnalysisAiPromptCandidate[]): string {
  return [
    'Tugas kamu: nilai kandidat klip untuk short-form video yang cepat, jelas, dan punya potensi viral.',
    'Gunakan hanya data kandidat yang diberikan. Jangan mengarang transkrip.',
    'Berikan skor 0-100 untuk viralScore, hookScore, dan clarityScore.',
    'label harus pendek, natural, dan relevan untuk creator Indonesia.',
    'reason harus singkat, spesifik, dan menjelaskan kenapa klip itu menarik.',
    'Nilai lebih tinggi untuk hook cepat, energi kuat, dan durasi aman untuk Shorts.',
    '',
    buildCandidateSummary(candidates),
  ].join('\n');
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

function parseAnalysisAiResponse(rawText: string, candidateCount: number): AnalysisAiRating[] {
  const parsed = analysisAiResponseSchema.parse(JSON.parse(rawText));
  const uniqueIndexes = new Set<number>();

  return parsed.candidates.filter((candidate) => {
    if (candidate.index < 0 || candidate.index >= candidateCount) {
      return false;
    }

    if (uniqueIndexes.has(candidate.index)) {
      return false;
    }

    uniqueIndexes.add(candidate.index);
    return true;
  });
}

async function requestOpenAiRatings(
  candidates: AnalysisAiPromptCandidate[],
): Promise<AnalysisAiRating[] | null> {
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
      model: OPENAI_RERANK_MODEL,
      input: [
        {
          role: 'system',
          content: [
            {
              type: 'input_text',
              text: 'You are a short-form content strategist. Return valid JSON only.',
            },
          ],
        },
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: buildRerankPrompt(candidates),
            },
          ],
        },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'director_analysis_ai_rerank',
          strict: true,
          schema: analysisAiResponseJsonSchema,
        },
      },
    }),
    signal: AbortSignal.timeout(env.DIRECTOR_LOCAL_RERANK_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`OpenAI analysis rerank failed: ${response.status}`);
  }

  const payload = await response.json();
  const outputText = extractOutputText(payload);
  if (!outputText) {
    throw new Error('OpenAI analysis rerank response missing output_text');
  }

  return parseAnalysisAiResponse(outputText, candidates.length);
}

async function requestOllamaRatings(
  candidates: AnalysisAiPromptCandidate[],
): Promise<AnalysisAiRating[] | null> {
  if (!env.OLLAMA_BASE_URL) {
    return null;
  }

  const response = await fetch(`${env.OLLAMA_BASE_URL}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: env.OLLAMA_MODEL,
      stream: false,
      keep_alive: OLLAMA_KEEP_ALIVE_SECONDS,
      format: analysisAiResponseJsonSchema,
      messages: [
        {
          role: 'system',
          content:
            'Kamu adalah strategist short-form content untuk creator Indonesia. Balas hanya JSON valid sesuai schema.',
        },
        {
          role: 'user',
          content: buildRerankPrompt(candidates),
        },
      ],
    }),
    signal: AbortSignal.timeout(env.DIRECTOR_LOCAL_RERANK_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Ollama analysis rerank failed: ${response.status}`);
  }

  const payload = await response.json();
  const outputText = extractOllamaMessage(payload);
  if (!outputText) {
    throw new Error('Ollama analysis rerank response missing message content');
  }

  return parseAnalysisAiResponse(outputText, candidates.length);
}

export async function requestAnalysisAiRatings(
  candidates: AnalysisAiPromptCandidate[],
): Promise<{ provider: AnalysisAiProvider; ratings: AnalysisAiRating[] | null }> {
  for (const provider of getPreferredProviders()) {
    const ratings =
      provider === 'ollama'
        ? await requestOllamaRatings(candidates)
        : await requestOpenAiRatings(candidates);

    if (ratings) {
      return { provider, ratings };
    }
  }

  return { provider: 'heuristic', ratings: null };
}
