import { describe, expect, it } from 'vitest';
import type { TimelineData } from './export-processor.types';
import { hasVisibleTimedContent, shouldUseModernCompositor } from './modern-compositor.processor';

const baseClip: TimelineData['clips'][number] = {
  localPath: '/uploads/temp/video.mp4',
  mediaType: 'video',
  startTime: 0,
  endTime: 5,
};

const baseTimeline: TimelineData = {
  clips: [baseClip],
  textOverlays: [],
  audioTracks: [],
  settings: {
    width: 1920,
    height: 1080,
    fps: 30,
    backgroundColor: '#000000',
    backgroundMode: 'solid',
  },
};

describe('modern compositor routing', () => {
  it('keeps simple single-clip exports on the legacy path', () => {
    expect(shouldUseModernCompositor(baseTimeline)).toBe(false);
  });

  it('uses the modern path for delayed clips', () => {
    expect(
      shouldUseModernCompositor({
        ...baseTimeline,
        clips: [{ ...baseClip, timelineStartMs: 2000, timelineEndMs: 7000 }],
      }),
    ).toBe(true);
  });

  it('uses the modern path for overlapping visual layers', () => {
    expect(
      shouldUseModernCompositor({
        ...baseTimeline,
        clips: [
          { ...baseClip, timelineStartMs: 0, timelineEndMs: 5000, zIndex: 0 },
          {
            localPath: '/uploads/temp/overlay.mp4',
            mediaType: 'video',
            startTime: 0,
            endTime: 4,
            timelineStartMs: 2000,
            timelineEndMs: 6000,
            zIndex: 1,
          },
        ],
      }),
    ).toBe(true);
  });

  it('uses the modern path for looped video clips', () => {
    expect(
      shouldUseModernCompositor({
        ...baseTimeline,
        clips: [{ ...baseClip, loop: true }],
      }),
    ).toBe(true);
  });

  it('uses the modern path for rotated text overlays', () => {
    expect(
      shouldUseModernCompositor({
        ...baseTimeline,
        textOverlays: [
          {
            id: 'text-1',
            content: 'Tilt',
            startMs: 0,
            endMs: 5000,
            x: 50,
            y: 50,
            fontSize: 64,
            fontFamily: 'Inter',
            color: '#ffffff',
            rotation: 12,
          },
        ],
      }),
    ).toBe(true);
  });

  it('uses the modern path for text-only timelines', () => {
    expect(
      shouldUseModernCompositor({
        ...baseTimeline,
        clips: [],
        textOverlays: [
          {
            id: 'text-1',
            content: 'Title card',
            startMs: 0,
            endMs: 5000,
            x: 50,
            y: 50,
            fontSize: 64,
            fontFamily: 'Inter',
            color: '#ffffff',
          },
        ],
      }),
    ).toBe(true);
  });

  it('uses the modern path for gradient backgrounds', () => {
    expect(
      shouldUseModernCompositor({
        ...baseTimeline,
        settings: {
          ...baseTimeline.settings,
          backgroundMode: 'gradient',
          backgroundGradientFrom: '#020617',
          backgroundGradientTo: '#2563eb',
          backgroundGradientAngle: 135,
        },
      }),
    ).toBe(true);
  });

  it('uses the modern path for image backgrounds', () => {
    expect(
      shouldUseModernCompositor({
        ...baseTimeline,
        settings: {
          ...baseTimeline.settings,
          backgroundMode: 'image',
          backgroundImagePath: '/uploads/project/background.jpg',
        },
      }),
    ).toBe(true);
  });

  it('treats text-only and audio-only projects as renderable timed content', () => {
    expect(
      hasVisibleTimedContent({
        ...baseTimeline,
        clips: [],
        textOverlays: [
          {
            id: 'text-1',
            content: 'Title',
            startMs: 0,
            endMs: 3000,
            x: 50,
            y: 50,
            fontSize: 64,
            fontFamily: 'Inter',
            color: '#ffffff',
          },
        ],
      }),
    ).toBe(true);

    expect(
      hasVisibleTimedContent({
        ...baseTimeline,
        clips: [],
        audioTracks: [
          {
            localPath: '/uploads/temp/voice.mp3',
            startTime: 0,
            endTime: 3,
            timelineStartMs: 0,
            timelineEndMs: 3000,
            volume: 1,
            fadeInMs: 0,
            fadeOutMs: 0,
          },
        ],
      }),
    ).toBe(true);
  });
});
