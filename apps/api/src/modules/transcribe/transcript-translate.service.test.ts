import { beforeEach, describe, expect, it, vi } from 'vitest';

const { envMock } = vi.hoisted(() => ({
  envMock: {
    AI_COPY_PROVIDER: 'openai' as 'auto' | 'openai' | 'ollama',
    OPENAI_API_KEY: 'test-openai',
    OLLAMA_BASE_URL: '',
    OLLAMA_MODEL: 'qwen3:14b',
  },
}));

vi.mock('@/config/env', () => ({
  env: envMock,
}));

describe('transcriptTranslateService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    envMock.AI_COPY_PROVIDER = 'openai';
    envMock.OPENAI_API_KEY = 'test-openai';
    envMock.OLLAMA_BASE_URL = '';
  });

  it('translates subtitle text with OpenAI and keeps segment timing', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          output_text: JSON.stringify({
            translations: ['Halo dunia', 'Ini contoh kedua'],
          }),
        }),
        { status: 200 },
      ),
    );

    const { transcriptTranslateService } = await import('./transcript-translate.service');

    const translated = await transcriptTranslateService.translateSegments(
      [
        {
          startMs: 0,
          endMs: 1200,
          text: 'Hello world',
          words: [{ startMs: 0, endMs: 600, text: 'Hello' }],
        },
        {
          startMs: 1200,
          endMs: 2400,
          text: 'This is second sample',
        },
      ],
      'id',
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(translated).toEqual([
      {
        startMs: 0,
        endMs: 1200,
        text: 'Halo dunia',
        words: undefined,
      },
      {
        startMs: 1200,
        endMs: 2400,
        text: 'Ini contoh kedua',
        words: undefined,
      },
    ]);
  });
});
