import { EventEmitter } from 'node:events';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const existsSyncMock = vi.fn<(path: string) => boolean>();
const spawnMock = vi.fn();

vi.mock('node:fs', () => ({
  existsSync: existsSyncMock,
}));

vi.mock('node:child_process', () => ({
  spawn: spawnMock,
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
    existsSyncMock.mockReset();
    spawnMock.mockReset();
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
    existsSyncMock.mockReturnValue(true);
    const { WhisperRunner } = await import('@/modules/transcribe/whisper-runner');

    await new WhisperRunner().runWhisperOnAudio('/tmp/audio.wav');

    expect(spawnMock).toHaveBeenCalledWith(
      expect.stringContaining('/apps/api/venv/bin/python'),
      expect.arrayContaining([expect.stringContaining('run_whisper.py'), '/tmp/audio.wav']),
    );
  });

  it('falls back to python3 when the project virtualenv is missing', async () => {
    existsSyncMock.mockReturnValue(false);
    const { WhisperRunner } = await import('@/modules/transcribe/whisper-runner');

    await new WhisperRunner().runWhisperOnAudio('/tmp/audio.wav');

    expect(spawnMock).toHaveBeenCalledWith(
      'python3',
      expect.arrayContaining([expect.stringContaining('run_whisper.py'), '/tmp/audio.wav']),
    );
  });
});
