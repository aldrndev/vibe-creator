import { beforeEach, describe, expect, it, vi } from 'vitest';

const { directorRepoMock, directorQueueMock, redisMock, envMock } = vi.hoisted(() => ({
  directorRepoMock: {
    findSession: vi.fn(),
    createTranscribeJob: vi.fn(),
    updateTranscribeJob: vi.fn(),
  },
  directorQueueMock: {
    add: vi.fn(),
  },
  redisMock: {
    status: 'ready',
  },
  envMock: {
    TRANSCRIBE_LANGUAGE: 'mixed',
  },
}));

vi.mock('@/modules/director/director.repo', () => ({
  directorRepo: directorRepoMock,
}));

vi.mock('@/modules/director/director.queue', () => ({
  directorQueue: directorQueueMock,
  buildDirectorQueueJobId: (...parts: Array<string | number>) => parts.join('-'),
}));

vi.mock('@/lib/redis', () => ({
  redis: redisMock,
}));

vi.mock('@/config/env', () => ({
  env: envMock,
}));

import { directorTranscribeService } from '@/modules/director/services/transcribe.service';

describe('directorTranscribeService.startTranscribe', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    redisMock.status = 'ready';
    envMock.TRANSCRIBE_LANGUAGE = 'mixed';
    directorRepoMock.findSession.mockResolvedValue({
      id: 'session-1',
      userId: 'user-1',
      selectedClips: [
        {
          id: 'clip-1',
          candidate: {
            startMs: 0,
            endMs: 35_000,
          },
        },
      ],
      transcribeJob: null,
    });
    directorRepoMock.createTranscribeJob.mockResolvedValue({
      id: 'job-1',
      status: 'PENDING',
    });
  });

  it('fails fast with a clear message when redis is not ready', async () => {
    redisMock.status = 'connecting';

    await expect(directorTranscribeService.startTranscribe('session-1', 'user-1')).rejects.toThrow(
      'Transcription queue belum siap. Pastikan Redis aktif lalu coba lagi.',
    );

    expect(directorRepoMock.createTranscribeJob).not.toHaveBeenCalled();
    expect(directorQueueMock.add).not.toHaveBeenCalled();
  });

  it('queues transcription with a BullMQ-safe job id', async () => {
    await directorTranscribeService.startTranscribe('session-1', 'user-1');

    expect(directorRepoMock.createTranscribeJob).toHaveBeenCalledWith(
      expect.objectContaining({
        segments: expect.objectContaining({
          clipCount: 1,
          clipDurationTotalMs: 35_000,
          phase: 'queued',
        }),
      }),
    );
    expect(directorQueueMock.add).toHaveBeenCalledWith(
      'transcribe_session',
      expect.objectContaining({
        type: 'TRANSCRIBE_SESSION',
        sessionId: 'session-1',
        userId: 'user-1',
        language: 'mixed',
      }),
      expect.objectContaining({
        jobId: expect.not.stringContaining(':'),
      }),
    );
  });

  it('returns completed job as-is when force refresh is not requested', async () => {
    directorRepoMock.findSession.mockResolvedValue({
      id: 'session-1',
      userId: 'user-1',
      selectedClips: [
        {
          id: 'clip-1',
          candidate: {
            startMs: 0,
            endMs: 35_000,
          },
          transcript: {
            status: 'COMPLETED',
            language: 'mixed',
          },
        },
      ],
      transcribeJob: {
        id: 'job-completed',
        status: 'COMPLETED',
      },
    });

    const result = await directorTranscribeService.startTranscribe('session-1', 'user-1');

    expect(result).toEqual(
      expect.objectContaining({
        id: 'job-completed',
        status: 'COMPLETED',
        language: 'mixed',
        subtitleMode: 'original',
        subtitleTargetLanguage: null,
      }),
    );
    expect(directorRepoMock.updateTranscribeJob).not.toHaveBeenCalled();
    expect(directorQueueMock.add).not.toHaveBeenCalled();
  });

  it('resets a completed job when selected clips do not have matching completed transcripts', async () => {
    directorRepoMock.findSession.mockResolvedValue({
      id: 'session-1',
      userId: 'user-1',
      selectedClips: [
        {
          id: 'clip-new',
          candidate: {
            startMs: 42_000,
            endMs: 82_000,
          },
          transcript: null,
        },
      ],
      transcribeJob: {
        id: 'job-completed',
        status: 'COMPLETED',
        language: 'mixed',
      },
    });
    directorRepoMock.updateTranscribeJob.mockResolvedValue({
      id: 'job-completed',
      status: 'PENDING',
    });

    const result = await directorTranscribeService.startTranscribe('session-1', 'user-1');

    expect(result).toEqual(
      expect.objectContaining({
        id: 'job-completed',
        status: 'PENDING',
      }),
    );
    expect(directorRepoMock.updateTranscribeJob).toHaveBeenCalledWith(
      'job-completed',
      expect.objectContaining({
        status: 'PENDING',
        errorMessage: null,
        startedAt: null,
        completedAt: null,
      }),
    );
    expect(directorQueueMock.add).toHaveBeenCalledWith(
      'transcribe_session',
      expect.objectContaining({
        type: 'TRANSCRIBE_SESSION',
        sessionId: 'session-1',
      }),
      expect.objectContaining({
        jobId: expect.any(String),
      }),
    );
  });

  it('resets completed job to pending and requeues when force refresh is requested', async () => {
    directorRepoMock.findSession.mockResolvedValue({
      id: 'session-1',
      userId: 'user-1',
      selectedClips: [
        {
          id: 'clip-1',
          candidate: {
            startMs: 0,
            endMs: 35_000,
          },
        },
      ],
      transcribeJob: {
        id: 'job-completed',
        status: 'COMPLETED',
      },
    });
    directorRepoMock.updateTranscribeJob.mockResolvedValue({
      id: 'job-completed',
      status: 'PENDING',
    });

    const result = await directorTranscribeService.startTranscribe('session-1', 'user-1', {
      forceRefresh: true,
    });

    expect(result).toEqual(
      expect.objectContaining({
        id: 'job-completed',
        status: 'PENDING',
        subtitleMode: 'original',
        subtitleTargetLanguage: null,
      }),
    );
    expect(directorRepoMock.updateTranscribeJob).toHaveBeenCalledWith(
      'job-completed',
      expect.objectContaining({
        status: 'PENDING',
        errorMessage: null,
        startedAt: null,
        completedAt: null,
        segments: expect.objectContaining({
          phase: 'queued',
          clipCount: 1,
        }),
      }),
    );
    expect(directorQueueMock.add).toHaveBeenCalledWith(
      'transcribe_session',
      expect.objectContaining({
        type: 'TRANSCRIBE_SESSION',
        sessionId: 'session-1',
        forceRefresh: true,
        language: 'mixed',
      }),
      expect.objectContaining({
        jobId: expect.any(String),
      }),
    );
  });

  it('blocks when active transcription is running with a different language', async () => {
    directorRepoMock.findSession.mockResolvedValue({
      id: 'session-1',
      userId: 'user-1',
      selectedClips: [
        {
          id: 'clip-1',
          candidate: {
            startMs: 0,
            endMs: 35_000,
          },
        },
      ],
      transcribeJob: {
        id: 'job-processing',
        status: 'PROCESSING',
        language: 'en',
      },
    });

    await expect(
      directorTranscribeService.startTranscribe('session-1', 'user-1', { language: 'id' }),
    ).rejects.toThrow(
      'Bahasa transkripsi berbeda dari job aktif. Jalankan transkripsi ulang setelah job saat ini selesai.',
    );

    expect(directorRepoMock.updateTranscribeJob).not.toHaveBeenCalled();
    expect(directorQueueMock.add).not.toHaveBeenCalled();
  });

  it('uses requested language when provided', async () => {
    await directorTranscribeService.startTranscribe('session-1', 'user-1', {
      language: 'en',
    });

    expect(directorRepoMock.createTranscribeJob).toHaveBeenCalledWith(
      expect.objectContaining({
        language: 'en',
      }),
    );
    expect(directorQueueMock.add).toHaveBeenCalledWith(
      'transcribe_session',
      expect.objectContaining({
        language: 'en',
      }),
      expect.any(Object),
    );
  });

  it('accepts non-id/en language codes', async () => {
    await directorTranscribeService.startTranscribe('session-1', 'user-1', {
      language: 'pt-BR',
    });

    expect(directorRepoMock.createTranscribeJob).toHaveBeenCalledWith(
      expect.objectContaining({
        language: 'pt-br',
      }),
    );
    expect(directorQueueMock.add).toHaveBeenCalledWith(
      'transcribe_session',
      expect.objectContaining({
        language: 'pt-br',
      }),
      expect.any(Object),
    );
  });

  it('requires a specific target language for subtitle translation mode', async () => {
    await expect(
      directorTranscribeService.startTranscribe('session-1', 'user-1', {
        subtitleMode: 'translate',
        subtitleTargetLanguage: 'mixed',
      }),
    ).rejects.toThrow('Bahasa target terjemahan harus spesifik');
  });
});
