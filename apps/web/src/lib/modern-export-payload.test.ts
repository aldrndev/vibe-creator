import {
  createAudioLayer,
  createTextLayer,
  createVideoLayer,
  MODERN_SCHEMA_VERSION,
} from '@vibe-creator/shared';
import { describe, expect, it } from 'vitest';
import { buildModernExportTimelineData } from '@/lib/modern-export-payload';
import type { EditorAsset, EditorTimeline } from '@/stores/editor-store';

const videoAsset: EditorAsset = {
  id: 'asset-video',
  name: 'source.mp4',
  type: 'VIDEO',
  url: 'blob:video',
  durationMs: 8000,
};

const audioAsset: EditorAsset = {
  id: 'asset-audio',
  name: 'music.mp3',
  type: 'AUDIO',
  url: 'blob:audio',
  durationMs: 10_000,
};

describe('modern export payload', () => {
  it('converts visual clips to API seconds and maps text overlays', () => {
    const videoLayer = createVideoLayer('layer-video', videoAsset.id, 0, 2000, 7000);
    const textLayer = createTextLayer('layer-text', 'Launch title', 1, 2500, 6500);
    const audioLayer = createAudioLayer('layer-audio', audioAsset.id, 2, 1000, 6000);
    textLayer.data.backgroundColor = '#000000';
    textLayer.data.fontFamily = 'Bangers';
    textLayer.data.fontWeight = 'bold';
    textLayer.data.animation = 'slide-up';
    textLayer.data.animationIn = 'pop';
    textLayer.data.animationOut = 'fade-out';
    textLayer.data.animationLoop = 'pulse';
    audioLayer.data.volume = 0.42;
    audioLayer.data.fadeIn = 500;
    audioLayer.data.fadeOut = 750;
    audioLayer.data.trimStartMs = 1500;

    const timeline: EditorTimeline = {
      durationMs: 7000,
      tracks: [
        {
          id: 'track-video-0',
          type: 'VIDEO',
          order: 0,
          muted: false,
          volume: 1,
          locked: false,
          clips: [
            {
              id: 'clip-video',
              assetId: videoAsset.id,
              startMs: videoLayer.startMs,
              endMs: videoLayer.endMs,
              trimStartMs: 1000,
              trimEndMs: 0,
              transforms: {
                x: 0,
                y: 0,
                scale: 1,
                rotation: 0,
                opacity: 1,
              },
              effects: {
                filters: ['vivid'],
                speed: 1,
                volume: 1,
                fadeIn: 500,
                fadeOut: 0,
                transitionIn: 'slide-left',
                transitionOut: 'none',
                motion: 'zoom-in',
              },
              asset: videoAsset,
            },
          ],
        },
        {
          id: 'track-audio-0',
          type: 'AUDIO',
          order: 1,
          muted: false,
          volume: 1,
          locked: false,
          clips: [
            {
              id: 'clip-audio',
              assetId: audioAsset.id,
              startMs: audioLayer.startMs,
              endMs: audioLayer.endMs,
              trimStartMs: audioLayer.data.trimStartMs,
              trimEndMs: audioLayer.data.trimEndMs,
              transforms: {
                x: 0,
                y: 0,
                scale: 1,
                rotation: 0,
                opacity: 1,
              },
              effects: {
                filters: [],
                speed: 1,
                volume: audioLayer.data.volume,
                fadeIn: audioLayer.data.fadeIn,
                fadeOut: audioLayer.data.fadeOut,
              },
              asset: audioAsset,
            },
            {
              id: 'clip-linked-video-audio',
              assetId: videoAsset.id,
              startMs: videoLayer.startMs,
              endMs: videoLayer.endMs,
              trimStartMs: videoLayer.data.trimStartMs,
              trimEndMs: videoLayer.data.trimEndMs,
              transforms: {
                x: 0,
                y: 0,
                scale: 1,
                rotation: 0,
                opacity: 1,
              },
              effects: {
                filters: [],
                speed: 1,
                volume: 1,
                fadeIn: 0,
                fadeOut: 0,
              },
              asset: videoAsset,
            },
          ],
        },
      ],
    };

    const payload = buildModernExportTimelineData({
      project: {
        schemaVersion: MODERN_SCHEMA_VERSION,
        id: 'project-export',
        title: 'Export Project',
        settings: {
          width: 1920,
          height: 1080,
          fps: 30,
          durationMs: 7000,
          backgroundColor: '#000000',
          backgroundMode: 'blur',
          backgroundBlurAmount: 22,
          backgroundBlurZoom: 1.12,
          backgroundDim: 0.12,
          backgroundSaturation: 1.2,
        },
        layers: [videoLayer, textLayer, audioLayer],
      },
      timeline,
      assetPathById: new Map([
        [videoAsset.id, 'uploaded-token.mp4'],
        [audioAsset.id, 'uploaded-music.mp3'],
      ]),
    });

    expect(payload.clips).toEqual([
      expect.objectContaining({
        localPath: 'uploaded-token.mp4',
        mediaType: 'video',
        startTime: 1,
        endTime: 6,
        effects: expect.objectContaining({
          filters: ['vivid'],
          fadeIn: 500,
          transitionIn: 'slide-left',
          motion: 'zoom-in',
        }),
      }),
    ]);
    expect(payload.textOverlays).toEqual([
      expect.objectContaining({
        id: 'layer-text',
        content: 'Launch title',
        startMs: 2500,
        endMs: 6500,
        fontFamily: 'Bangers',
        fontWeight: 'bold',
        backgroundColor: '#000000',
        animation: 'slide-up',
        animationIn: 'pop',
        animationOut: 'fade-out',
        animationLoop: 'pulse',
      }),
    ]);
    expect(payload.audioTracks).toEqual([
      {
        localPath: 'uploaded-music.mp3',
        startTime: 1.5,
        endTime: 6.5,
        timelineStartMs: 1000,
        timelineEndMs: 6000,
        volume: 0.42,
        fadeInMs: 500,
        fadeOutMs: 750,
      },
    ]);
    expect(payload.settings).toEqual({
      width: 1920,
      height: 1080,
      fps: 30,
      backgroundColor: '#000000',
      backgroundMode: 'blur',
      backgroundBlurAmount: 22,
      backgroundBlurZoom: 1.12,
      backgroundDim: 0.12,
      backgroundSaturation: 1.2,
    });
  });
});
