import { beforeEach, describe, expect, it, vi } from 'vitest';

const findSessionMock = vi.fn();
const fetchMock = vi.fn();
const envMock = {
  AI_COPY_PROVIDER: 'openai',
  OPENAI_API_KEY: 'test-openai-key',
  OLLAMA_BASE_URL: 'http://localhost:11434/api',
  OLLAMA_MODEL: 'qwen3:14b',
};

vi.mock('@/modules/director/director.repo', () => ({
  directorRepo: {
    findSession: findSessionMock,
  },
}));

vi.mock('@/config/env', () => ({
  env: envMock,
}));

vi.stubGlobal('fetch', fetchMock);

function createSession() {
  return {
    id: 'session-1',
    selectedClips: [
      {
        id: 'clip-1',
        candidate: {
          score: 0.92,
          startMs: 0,
          endMs: 35000,
          tags: ['HIGH ENERGY', 'HOOK'],
          metadata: {
            scoreBreakdown: {
              topSignals: ['Hook cepat', 'Dialog padat'],
              contentModeSuggestion: 'talking-head',
            },
            aiRerank: {
              hookScore: 97,
              viralScore: 94,
              clarityScore: 88,
              reason: 'Hook pembuka langsung kuat dan ritmenya rapat.',
            },
          },
        },
        transcript: {
          segments: [{ text: 'Cara bikin hook video yang langsung bikin orang berhenti scroll.' }],
        },
      },
    ],
  };
}

describe('directorPublishCopyService', () => {
  beforeEach(() => {
    findSessionMock.mockReset();
    fetchMock.mockReset();
    vi.resetModules();
    envMock.AI_COPY_PROVIDER = 'openai';
  });

  it('falls back to heuristic copy when OpenAI request fails', async () => {
    findSessionMock.mockResolvedValue(createSession());
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
    });

    const { directorPublishCopyService } = await import(
      '@/modules/director/services/publish-copy.service'
    );

    const result = await directorPublishCopyService.getPublishCopy('session-1', 'user-1');

    expect(result.source).toBe('heuristic');
    expect(result.provider).toBe('heuristic');
    expect(result.title).toContain('Cara bikin hook');
    expect(result.hashtags).toContain('#tutorial');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('returns AI copy when OpenAI responds with valid structured output', async () => {
    findSessionMock.mockResolvedValue(createSession());
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        output_text: JSON.stringify({
          title: 'Hook ini bikin viewers langsung berhenti scroll',
          caption: 'Kupas pola hook cepat yang bisa bikin retention naik sejak detik pertama.',
          cta: 'Simpan video ini kalau mau pakai formula hook yang sama.',
          hashtags: ['shorts', '#viralideas', '#hookvideo'],
        }),
      }),
    });

    const { directorPublishCopyService } = await import(
      '@/modules/director/services/publish-copy.service'
    );

    const result = await directorPublishCopyService.getPublishCopy('session-1', 'user-1');

    expect(result.source).toBe('ai');
    expect(result.provider).toBe('openai');
    expect(result.title).toContain('berhenti scroll');
    expect(result.hashtags).toContain('#shorts');
    expect(result.hashtags).toContain('#hookvideo');
  });

  it('returns AI copy from Ollama when provider is set to ollama', async () => {
    envMock.AI_COPY_PROVIDER = 'ollama';
    findSessionMock.mockResolvedValue(createSession());
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({}) }).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        message: {
          content: JSON.stringify({
            title: 'Formula hook ini cocok buat Shorts edukasi',
            caption: 'Pakai pola ini untuk buka video dengan ritme yang lebih cepat dan jelas.',
            cta: 'Coba pakai struktur ini di video berikutnya.',
            hashtags: ['shorts', 'edukasi', '#viralideas'],
          }),
        },
      }),
    });

    const { directorPublishCopyService } = await import(
      '@/modules/director/services/publish-copy.service'
    );

    const result = await directorPublishCopyService.getPublishCopy('session-1', 'user-1');

    expect(result.source).toBe('ai');
    expect(result.provider).toBe('ollama');
    expect(result.title).toContain('Formula hook');
    expect(fetchMock.mock.calls[0]?.[0]).toBe('http://localhost:11434/api/tags');
    expect(fetchMock.mock.calls[1]?.[0]).toBe('http://localhost:11434/api/chat');
    const requestBody = JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body));

    expect(requestBody.keep_alive).toBe(0);
    expect(requestBody.messages[1]?.content).toContain('Tugasmu bukan menyalin transkrip');
    expect(requestBody.messages[1]?.content).toContain('Durasi klip: 35 detik');
    expect(requestBody.messages[1]?.content).toContain('Tag kandidat: HIGH ENERGY, HOOK');
    expect(requestBody.messages[1]?.content).toContain(
      'AI score -> viral: 94, hook: 97, clarity: 88',
    );
  });

  it('falls back to heuristic when Ollama health check fails', async () => {
    envMock.AI_COPY_PROVIDER = 'ollama';
    findSessionMock.mockResolvedValue(createSession());
    fetchMock.mockResolvedValueOnce({ ok: false, status: 503 });

    const { directorPublishCopyService } = await import(
      '@/modules/director/services/publish-copy.service'
    );

    const result = await directorPublishCopyService.getPublishCopy('session-1', 'user-1');

    expect(result.source).toBe('heuristic');
    expect(result.notice.lastError).toContain('tidak aktif');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
