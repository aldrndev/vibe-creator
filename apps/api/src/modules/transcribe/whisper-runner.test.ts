import { EventEmitter } from 'node:events';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { existsSyncMock, spawnMock, breakerFireMock, createCircuitBreakerMock, envMock } =
  vi.hoisted(() => ({
    existsSyncMock: vi.fn<(path: string) => boolean>(),
    spawnMock: vi.fn(),
    breakerFireMock: vi.fn(),
    createCircuitBreakerMock: vi.fn(),
    envMock: {
      TRANSCRIBE_PROVIDER: 'local' as 'auto' | 'local' | 'http',
      TRANSCRIBE_SERVICE_URL: 'http://localhost:8765',
      TRANSCRIBE_SERVICE_TOKEN: '',
      TRANSCRIBE_HTTP_TIMEOUT_MS: 120000,
      TRANSCRIBE_ALLOW_LOCAL_FALLBACK: true,
      TRANSCRIBE_LANGUAGE: 'mixed' as 'id' | 'en' | 'mixed',
    },
  }));

vi.mock('node:fs', () => ({
  existsSync: existsSyncMock,
}));

vi.mock('node:child_process', () => ({
  spawn: spawnMock,
}));

vi.mock('@/config/env', () => ({
  env: envMock,
}));

vi.mock('@/lib/circuit-breaker', () => ({
  createCircuitBreaker: createCircuitBreakerMock,
}));

type MockProcess = EventEmitter & {
  stdout: EventEmitter;
  stderr: EventEmitter;
};

function createMockProcess() {
  const process = new EventEmitter() as MockProcess;
  process.stdout = new EventEmitter();
  process.stderr = new EventEmitter();
  return process;
}

describe('WhisperRunner', () => {
  beforeEach(() => {
    vi.resetModules();
    existsSyncMock.mockReset();
    spawnMock.mockReset();
    breakerFireMock.mockReset();
    createCircuitBreakerMock.mockReset();
    createCircuitBreakerMock.mockReturnValue({
      fire: breakerFireMock,
    });

    envMock.TRANSCRIBE_PROVIDER = 'local';
    envMock.TRANSCRIBE_SERVICE_URL = 'http://localhost:8765';
    envMock.TRANSCRIBE_SERVICE_TOKEN = '';
    envMock.TRANSCRIBE_HTTP_TIMEOUT_MS = 120000;
    envMock.TRANSCRIBE_ALLOW_LOCAL_FALLBACK = true;
    envMock.TRANSCRIBE_LANGUAGE = 'mixed';

    spawnMock.mockImplementation(() => {
      const process = createMockProcess();

      queueMicrotask(() => {
        process.stdout.emit(
          'data',
          JSON.stringify({
            success: true,
            language: 'en',
            segments: [],
          }),
        );
        process.emit('close', 0);
      });

      return process;
    });
  });

  it('uses the project virtualenv python when available', async () => {
    envMock.TRANSCRIBE_PROVIDER = 'local';
    existsSyncMock.mockReturnValue(true);
    const { WhisperRunner } = await import('@/modules/transcribe/whisper-runner');

    const result = await new WhisperRunner().runWhisperOnAudio('/tmp/audio.wav', 'en');

    expect(spawnMock).toHaveBeenCalledWith(
      expect.stringContaining('/apps/api/venv/bin/python'),
      expect.arrayContaining([expect.stringContaining('run_whisper.py'), '/tmp/audio.wav', 'en']),
    );
    expect(result.provider).toBe('local');
    expect(breakerFireMock).not.toHaveBeenCalled();
  });

  it('falls back to python3 when the project virtualenv is missing', async () => {
    envMock.TRANSCRIBE_PROVIDER = 'local';
    existsSyncMock.mockReturnValue(false);
    const { WhisperRunner } = await import('@/modules/transcribe/whisper-runner');

    const result = await new WhisperRunner().runWhisperOnAudio('/tmp/audio.wav', 'id');

    expect(spawnMock).toHaveBeenCalledWith(
      'python3',
      expect.arrayContaining([expect.stringContaining('run_whisper.py'), '/tmp/audio.wav', 'id']),
    );
    expect(result.provider).toBe('local');
  });

  it('uses dedicated HTTP service when provider is set to http', async () => {
    envMock.TRANSCRIBE_PROVIDER = 'http';
    breakerFireMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          language: 'id',
          segments: [],
        }),
        { status: 200 },
      ),
    );
    const { WhisperRunner } = await import('@/modules/transcribe/whisper-runner');

    const result = await new WhisperRunner().runWhisperOnAudio('/tmp/audio.wav', 'en');

    expect(result.success).toBe(true);
    expect(result.provider).toBe('http');
    expect(spawnMock).not.toHaveBeenCalled();
    expect(breakerFireMock).toHaveBeenCalledTimes(1);
    const requestInit = breakerFireMock.mock.calls[0]?.[1] as RequestInit | undefined;
    const payload = requestInit?.body ? JSON.parse(requestInit.body as string) : {};
    expect(payload.language).toBe('en');
  });

  it('falls back to local whisper when HTTP mode fails and fallback is enabled', async () => {
    envMock.TRANSCRIBE_PROVIDER = 'auto';
    envMock.TRANSCRIBE_ALLOW_LOCAL_FALLBACK = true;
    existsSyncMock.mockReturnValue(false);
    breakerFireMock.mockRejectedValue(new Error('service unavailable'));
    const { WhisperRunner } = await import('@/modules/transcribe/whisper-runner');

    const result = await new WhisperRunner().runWhisperOnAudio('/tmp/audio.wav', 'id');

    expect(result.success).toBe(true);
    expect(result.provider).toBe('local');
    expect(spawnMock).toHaveBeenCalledWith(
      'python3',
      expect.arrayContaining([expect.stringContaining('run_whisper.py'), '/tmp/audio.wav', 'id']),
    );
  });

  it('returns HTTP failure when fallback is disabled', async () => {
    envMock.TRANSCRIBE_PROVIDER = 'http';
    envMock.TRANSCRIBE_ALLOW_LOCAL_FALLBACK = false;
    breakerFireMock.mockResolvedValue(new Response('upstream failed', { status: 503 }));
    const { WhisperRunner } = await import('@/modules/transcribe/whisper-runner');

    const result = await new WhisperRunner().runWhisperOnAudio('/tmp/audio.wav', 'id');

    expect(result.success).toBe(false);
    expect(result.provider).toBe('http');
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it('uses default environment language when no language is provided', async () => {
    envMock.TRANSCRIBE_PROVIDER = 'http';
    envMock.TRANSCRIBE_LANGUAGE = 'en';
    breakerFireMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          language: 'en',
          segments: [],
        }),
        { status: 200 },
      ),
    );
    const { WhisperRunner } = await import('@/modules/transcribe/whisper-runner');

    const result = await new WhisperRunner().runWhisperOnAudio('/tmp/audio.wav');

    expect(result.success).toBe(true);
    const requestInit = breakerFireMock.mock.calls[0]?.[1] as RequestInit | undefined;
    const payload = requestInit?.body ? JSON.parse(requestInit.body as string) : {};
    expect(payload.language).toBe('en');
  });

  it('passes mixed language to HTTP provider for automatic multilingual detection', async () => {
    envMock.TRANSCRIBE_PROVIDER = 'http';
    breakerFireMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          language: 'id',
          segments: [],
        }),
        { status: 200 },
      ),
    );
    const { WhisperRunner } = await import('@/modules/transcribe/whisper-runner');

    const result = await new WhisperRunner().runWhisperOnAudio('/tmp/audio.wav', 'mixed');

    expect(result.success).toBe(true);
    const requestInit = breakerFireMock.mock.calls[0]?.[1] as RequestInit | undefined;
    const payload = requestInit?.body ? JSON.parse(requestInit.body as string) : {};
    expect(payload.language).toBe('mixed');
  });
});
