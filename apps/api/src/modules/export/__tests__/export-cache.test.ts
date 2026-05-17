import { describe, expect, it } from 'vitest';
import { createExportDisplayFilename, createExportFingerprint } from '../export-cache';
import type { TimelineData } from '../processors/export-processor.types';

const baseTimeline: TimelineData = {
  clips: [
    {
      localPath: 'project-asset:asset-video',
      mediaType: 'video',
      startTime: 0,
      endTime: 5,
      effects: {
        filters: [],
        speed: 1,
        volume: 1,
        fadeIn: 0,
        fadeOut: 0,
      },
    },
  ],
  textOverlays: [
    {
      id: 'text-1',
      content: 'Halo',
      startMs: 0,
      endMs: 2000,
      x: 50,
      y: 50,
      fontSize: 48,
      fontFamily: 'Inter',
      color: '#ffffff',
    },
  ],
  audioTracks: [],
  settings: {
    width: 1080,
    height: 1920,
    fps: 30,
    backgroundColor: '#000000',
    backgroundMode: 'solid',
  },
};

describe('export cache utilities', () => {
  it('creates stable fingerprints for equivalent export payloads', () => {
    const first = createExportFingerprint({
      projectId: 'project-1',
      format: 'MP4',
      resolution: 'HD',
      addWatermark: false,
      timelineData: baseTimeline,
    });
    const second = createExportFingerprint({
      resolution: 'HD',
      addWatermark: false,
      format: 'MP4',
      projectId: 'project-1',
      timelineData: {
        ...baseTimeline,
        clips: [...baseTimeline.clips],
      },
    });

    expect(second).toBe(first);
  });

  it('changes fingerprint when timing or text changes', () => {
    const original = createExportFingerprint({
      projectId: 'project-1',
      format: 'MP4',
      resolution: 'HD',
      addWatermark: false,
      timelineData: baseTimeline,
    });
    const changed = createExportFingerprint({
      projectId: 'project-1',
      format: 'MP4',
      resolution: 'HD',
      addWatermark: false,
      timelineData: {
        ...baseTimeline,
        textOverlays: baseTimeline.textOverlays?.map((overlay) => ({
          ...overlay,
          content: 'Berubah',
        })),
      },
    });

    expect(changed).not.toBe(original);
  });

  it('creates short human-readable filenames', () => {
    const filename = createExportDisplayFilename({
      projectTitle: 'My Viral Video: Hook / CTA Edition!!!',
      createdAt: new Date('2026-05-17T02:03:00.000Z'),
    });

    expect(filename).toBe('video-studio-my-viral-video-hook-cta-edition-20260517-0203.mp4');
  });

  it('omits title segment when project title is empty', () => {
    const filename = createExportDisplayFilename({
      projectTitle: '   ',
      createdAt: new Date('2026-05-17T02:03:00.000Z'),
    });

    expect(filename).toBe('video-studio-20260517-0203.mp4');
  });
});
