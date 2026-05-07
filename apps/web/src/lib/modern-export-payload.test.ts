import { createTextLayer, createVideoLayer, MODERN_SCHEMA_VERSION } from '@vibe-creator/shared';
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

describe('modern export payload', () => {
  it('converts visual clips to API seconds and maps text overlays', () => {
    const videoLayer = createVideoLayer('layer-video', videoAsset.id, 0, 2000, 7000);
    const textLayer = createTextLayer('layer-text', 'Launch title', 1, 2500, 6500);
    textLayer.data.backgroundColor = '#000000';

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
        },
        layers: [videoLayer, textLayer],
      },
      timeline,
      assetPathById: new Map([[videoAsset.id, 'uploaded-token.mp4']]),
    });

    expect(payload.clips).toEqual([
      expect.objectContaining({
        localPath: 'uploaded-token.mp4',
        mediaType: 'video',
        startTime: 1,
        endTime: 6,
      }),
    ]);
    expect(payload.textOverlays).toEqual([
      expect.objectContaining({
        id: 'layer-text',
        content: 'Launch title',
        startMs: 2500,
        endMs: 6500,
        backgroundColor: '#000000',
      }),
    ]);
  });
});
