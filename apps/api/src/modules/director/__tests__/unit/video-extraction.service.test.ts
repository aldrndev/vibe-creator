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

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

type MockProcess = EventEmitter & {
  stderr: EventEmitter;
};

function createMockProcess(exitCode: number): MockProcess {
  const process = new EventEmitter() as MockProcess;
  process.stderr = new EventEmitter();

  queueMicrotask(() => {
    process.emit('close', exitCode);
  });

  return process;
}

describe('videoExtractionService.generateClipVideoPreview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    existsSyncMock.mockReturnValue(true);
    spawnMock.mockImplementation(() => createMockProcess(0));
  });

  it('uses browser-safe ffmpeg arguments for generated preview clips', async () => {
    const { videoExtractionService } = await import(
      '@/modules/director/processing/video-extraction.service'
    );

    await videoExtractionService.generateClipVideoPreview(
      '/tmp/source-video.mp4',
      '/tmp/director-preview',
      1500,
      9500,
      'preview.mp4',
    );

    expect(spawnMock).toHaveBeenCalledTimes(1);
    const spawnArgs = spawnMock.mock.calls[0]?.[1] as string[];
    expect(spawnArgs).toEqual(
      expect.arrayContaining([
        '-map',
        '0:v:0',
        '-map',
        '0:a:0?',
        '-vf',
        'scale=-2:720',
        '-crf',
        '23',
        '-b:a',
        '128k',
        '-pix_fmt',
        'yuv420p',
        '-movflags',
        '+faststart',
        '-f',
        'mp4',
      ]),
    );
  });
});
