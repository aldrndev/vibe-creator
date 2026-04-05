import { beforeEach, describe, expect, it, vi } from 'vitest';

const fetchMock = vi.fn();
const envMock = {
  AI_COPY_PROVIDER: 'ollama',
  OPENAI_API_KEY: '',
  OLLAMA_BASE_URL: 'http://localhost:11434/api',
  OLLAMA_MODEL: 'qwen3:14b',
};

vi.mock('@/config/env', () => ({
  env: envMock,
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.stubGlobal('fetch', fetchMock);

describe('directorAnalysisAiRerankService', () => {
  const scoreBreakdown = {
    energy: 82,
    dialogDensity: 74,
    durationFit: 92,
    visualPenalty: 4,
    topSignals: ['Energy 82', 'Dialog 74', 'Durasi 92'],
    badges: ['Highlight', 'Durasi Pas'],
    contentModeSuggestion: 'general' as const,
  };

  beforeEach(() => {
    fetchMock.mockReset();
    envMock.AI_COPY_PROVIDER = 'ollama';
    envMock.OPENAI_API_KEY = '';
  });

  it('reranks candidates using Ollama structured output', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        message: {
          content: JSON.stringify({
            candidates: [
              {
                index: 1,
                label: 'Hook Cepat',
                reason: 'Pembukanya paling cepat terasa dan durasinya aman untuk Shorts.',
                viralScore: 92,
                hookScore: 95,
                clarityScore: 81,
              },
              {
                index: 0,
                label: 'Paling Seimbang',
                reason: 'Masih kuat, tapi pembukanya tidak seagresif kandidat kedua.',
                viralScore: 80,
                hookScore: 76,
                clarityScore: 86,
              },
            ],
          }),
        },
      }),
    });

    const { directorAnalysisAiRerankService } = await import(
      '@/modules/director/services/analysis-ai-rerank.service'
    );

    const result = await directorAnalysisAiRerankService.rerankCandidates([
      {
        startMs: 0,
        endMs: 26000,
        score: 0.82,
        rank: 1,
        tags: ['highlight'],
        scoreBreakdown,
      },
      {
        startMs: 30000,
        endMs: 45000,
        score: 0.79,
        rank: 2,
        tags: ['HIGH ENERGY'],
        scoreBreakdown: {
          ...scoreBreakdown,
          badges: ['Highlight', 'High Energy', 'Fast'],
        },
      },
    ]);

    expect(result[0]?.rank).toBe(1);
    expect(result[0]?.metadata.aiRerank).toMatchObject({
      provider: 'ollama',
      label: 'Hook Cepat',
    });
    expect(result[0]?.metadata.scoreBreakdown).toMatchObject({
      badges: expect.arrayContaining(['Hook Kuat']),
    });
    expect(result[0]?.startMs).toBe(30000);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('falls back to heuristic metadata when AI request fails', async () => {
    fetchMock.mockRejectedValue(new Error('timeout'));

    const { directorAnalysisAiRerankService } = await import(
      '@/modules/director/services/analysis-ai-rerank.service'
    );

    const result = await directorAnalysisAiRerankService.rerankCandidates([
      {
        startMs: 0,
        endMs: 14000,
        score: 0.91,
        rank: 1,
        tags: ['HIGH ENERGY'],
        scoreBreakdown: {
          ...scoreBreakdown,
          badges: ['Highlight', 'High Energy', 'Fast'],
          contentModeSuggestion: 'talking-head',
        },
      },
    ]);

    expect(result[0]?.metadata.aiRerank).toMatchObject({
      provider: 'heuristic',
      label: 'Hook Cepat',
    });
    expect(result[0]?.score).toBeGreaterThan(0.9);
  });
});
