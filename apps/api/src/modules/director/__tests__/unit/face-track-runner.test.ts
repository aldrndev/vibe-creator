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

describe('FaceTrackRunner', () => {
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
            frames: 120,
            detections: 118,
            objectDetections: 64,
            multiFaceFrames: 24,
            maxFacesInFrame: 2,
            targetSwitches: 8,
            snapRepositions: 14,
            sceneCuts: 3,
            focusProfile: 'object-center',
            trackingPreset: 'object-center',
            detectorsUsed: ['frontal', 'profile', 'object-edges'],
          }),
        );
        process.emit('close', 0);
      });

      return process;
    });
  });

  it('uses the project virtualenv python when available', async () => {
    existsSyncMock.mockReturnValue(true);
    const { FaceTrackRunner } = await import('@/modules/director/processing/face-track-runner');

    await new FaceTrackRunner().trackPortraitClip({
      inputPath: '/tmp/input.mp4',
      outputPath: '/tmp/output.mp4',
      targetWidth: 1080,
      targetHeight: 1920,
      focusProfile: 'subject-center',
    });

    expect(spawnMock).toHaveBeenCalledWith(
      expect.stringContaining('/apps/api/venv/bin/python'),
      expect.arrayContaining([
        expect.stringContaining('run_face_tracking.py'),
        '/tmp/input.mp4',
        '/tmp/output.mp4',
        '1080',
        '1920',
        'subject-center',
      ]),
    );
  });

  it('falls back to python3 when the project virtualenv is missing', async () => {
    existsSyncMock.mockReturnValue(false);
    const { FaceTrackRunner } = await import('@/modules/director/processing/face-track-runner');

    await new FaceTrackRunner().trackPortraitClip({
      inputPath: '/tmp/input.mp4',
      outputPath: '/tmp/output.mp4',
      targetWidth: 720,
      targetHeight: 1280,
    });

    expect(spawnMock).toHaveBeenCalledWith(
      'python3',
      expect.arrayContaining([
        expect.stringContaining('run_face_tracking.py'),
        '/tmp/input.mp4',
        '/tmp/output.mp4',
        '720',
        '1280',
        'auto',
      ]),
    );
  });

  it('returns extended tracking metadata from the python script', async () => {
    existsSyncMock.mockReturnValue(false);
    const { FaceTrackRunner } = await import('@/modules/director/processing/face-track-runner');

    const result = await new FaceTrackRunner().trackPortraitClip({
      inputPath: '/tmp/input.mp4',
      outputPath: '/tmp/output.mp4',
      targetWidth: 720,
      targetHeight: 1280,
    });

    expect(result.success).toBe(true);
    expect(result.multiFaceFrames).toBe(24);
    expect(result.maxFacesInFrame).toBe(2);
    expect(result.objectDetections).toBe(64);
    expect(result.targetSwitches).toBe(8);
    expect(result.snapRepositions).toBe(14);
    expect(result.sceneCuts).toBe(3);
    expect(result.focusProfile).toBe('object-center');
    expect(result.trackingPreset).toBe('object-center');
    expect(result.detectorsUsed).toEqual(['frontal', 'profile', 'object-edges']);
  });
});
