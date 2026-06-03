import { createImageLayer, createTextLayer, createVideoLayer } from '@vibe-creator/shared';
import { describe, expect, it } from 'vitest';
import {
  buildTimelineClipViewModels,
  buildTimelineRulerTicks,
  buildTimelineWaveformBars,
  calculateMovedLayerTiming,
  calculateTrimmedLayerTiming,
  clampTimelineScrollLeft,
  collectTimelineSnapPoints,
  formatTimelineTime,
  getCompactTimelineAssetName,
  getTimelineAutoScrollDelta,
  getTimelineDurationMs,
  getTimelineNavigatorThumbMetrics,
  getTimelineReorderTargetLayerId,
  getTimelineScrollLeftFromNavigatorPoint,
  getTimelineScrollLeftFromNavigatorThumbDrag,
  getTimelineScrollLeftToShowTime,
  getTimelineThumbnailTileCount,
  getTimelineTickStepMs,
  isEditableInputTarget,
  shouldShowTimelineClipLabel,
  snapTimelineTime,
  timelineMsToPx,
  timelinePxToMs,
} from '@/lib/modern-timeline-utils';
import type { EditorAsset } from '@/stores/editor-store';

describe('modern timeline utils', () => {
  it('formats timeline time as minutes, seconds, and centiseconds', () => {
    expect(formatTimelineTime(0)).toBe('0:00.00');
    expect(formatTimelineTime(65_430)).toBe('1:05.43');
  });

  it('collects snap points while ignoring selected layers', () => {
    const videoLayer = createVideoLayer('video-layer', 'asset-video', 0, 1_000, 5_000);
    const textLayer = createTextLayer('text-layer', 'Title', 1, 6_000, 9_000);

    expect(
      collectTimelineSnapPoints([videoLayer, textLayer], 2_500, new Set(['video-layer'])),
    ).toEqual([0, 2_500, 6_000, 9_000]);
  });

  it('snaps values inside the threshold and leaves distant values alone', () => {
    expect(snapTimelineTime({ valueMs: 1_090, snapPoints: [0, 1_000, 3_000] })).toBe(1_000);
    expect(snapTimelineTime({ valueMs: 1_300, snapPoints: [0, 1_000, 3_000] })).toBe(1_300);
  });

  it('moves layers with snapping while preserving duration', () => {
    const layer = createVideoLayer('video-layer', 'asset-video', 0, 1_000, 4_000);

    expect(calculateMovedLayerTiming({ layer, deltaMs: 1_080, snapPoints: [2_000] })).toEqual({
      startMs: 2_000,
      endMs: 5_000,
    });
  });

  it('trims layer edges without allowing invalid duration', () => {
    const layer = createVideoLayer('video-layer', 'asset-video', 0, 1_000, 4_000);

    expect(
      calculateTrimmedLayerTiming({
        layer,
        edge: 'start',
        targetMs: 3_950,
        snapPoints: [],
      }),
    ).toEqual({
      startMs: 3_900,
      endMs: 4_000,
    });
  });

  it('treats non-browser shortcut targets as non-editable', () => {
    expect(isEditableInputTarget(null)).toBe(false);
  });

  it('converts timeline time and pixels using the current zoom', () => {
    expect(timelineMsToPx(2_000, 24)).toBe(48);
    expect(timelinePxToMs(48, 24)).toBe(2_000);
  });

  it('clamps timeline horizontal scroll inside the available range', () => {
    expect(clampTimelineScrollLeft(-20, 1_000, 320)).toBe(0);
    expect(clampTimelineScrollLeft(240, 1_000, 320)).toBe(240);
    expect(clampTimelineScrollLeft(900, 1_000, 320)).toBe(680);
  });

  it('calculates navigator thumb metrics from viewport and scroll state', () => {
    expect(
      getTimelineNavigatorThumbMetrics({
        scrollLeftPx: 250,
        scrollWidthPx: 1_000,
        viewportWidthPx: 250,
        trackWidthPx: 200,
      }),
    ).toEqual({
      scrollable: true,
      thumbLeftPx: 50,
      thumbWidthPx: 50,
    });
  });

  it('maps navigator track clicks to timeline scroll positions', () => {
    expect(
      getTimelineScrollLeftFromNavigatorPoint({
        pointerX: 150,
        trackLeftPx: 0,
        trackWidthPx: 200,
        scrollWidthPx: 1_000,
        viewportWidthPx: 250,
      }),
    ).toBe(625);
  });

  it('maps navigator thumb drags to timeline scroll positions', () => {
    expect(
      getTimelineScrollLeftFromNavigatorThumbDrag({
        deltaX: 50,
        startScrollLeftPx: 250,
        trackWidthPx: 200,
        scrollWidthPx: 1_000,
        viewportWidthPx: 250,
      }),
    ).toBe(500);
  });

  it('calculates scrub auto-scroll near viewport edges', () => {
    expect(
      getTimelineAutoScrollDelta({
        pointerClientX: 110,
        viewportLeftPx: 100,
        viewportRightPx: 500,
        edgePaddingPx: 50,
        maxStepPx: 20,
      }),
    ).toBe(-16);
    expect(
      getTimelineAutoScrollDelta({
        pointerClientX: 490,
        viewportLeftPx: 100,
        viewportRightPx: 500,
        edgePaddingPx: 50,
        maxStepPx: 20,
      }),
    ).toBe(16);
    expect(
      getTimelineAutoScrollDelta({
        pointerClientX: 250,
        viewportLeftPx: 100,
        viewportRightPx: 500,
      }),
    ).toBe(0);
  });

  it('scrolls just enough to keep a playhead time visible', () => {
    expect(
      getTimelineScrollLeftToShowTime({
        timeLeftPx: 520,
        scrollLeftPx: 0,
        scrollWidthPx: 1_000,
        viewportWidthPx: 300,
        paddingPx: 50,
      }),
    ).toBe(270);
    expect(
      getTimelineScrollLeftToShowTime({
        timeLeftPx: 120,
        scrollLeftPx: 300,
        scrollWidthPx: 1_000,
        viewportWidthPx: 300,
        paddingPx: 50,
      }),
    ).toBe(70);
  });

  it('chooses readable ruler tick intervals by zoom level', () => {
    expect(getTimelineTickStepMs(96)).toBe(1_000);
    expect(getTimelineTickStepMs(48)).toBe(2_000);
    expect(getTimelineTickStepMs(24)).toBe(5_000);
    expect(getTimelineTickStepMs(8)).toBe(10_000);
  });

  it('builds ruler ticks with pixel positions and labels', () => {
    expect(buildTimelineRulerTicks(10_000, 24)).toEqual([
      { timeMs: 0, leftPx: 0, label: '0:00', major: true },
      { timeMs: 5_000, leftPx: 120, label: '0:05', major: false },
      { timeMs: 10_000, leftPx: 240, label: '0:10', major: true },
    ]);
  });

  it('keeps a minimum timeline duration with tail padding after the final layer', () => {
    expect(getTimelineDurationMs(4_000)).toBe(15_000);
    expect(getTimelineDurationMs(20_000)).toBe(21_000);
  });

  it('finds a vertical reorder target after a meaningful row drag', () => {
    const input = {
      containerTopPx: 100,
      rowHeightPx: 48,
      layerIds: ['top', 'middle', 'bottom'],
      draggedLayerId: 'top',
      pointerStartY: 124,
    };

    expect(getTimelineReorderTargetLayerId({ ...input, clientY: 132 })).toBeNull();
    expect(getTimelineReorderTargetLayerId({ ...input, clientY: 168 })).toBe('middle');
    expect(getTimelineReorderTargetLayerId({ ...input, clientY: 260 })).toBe('bottom');
  });

  it('builds clip view models without changing original timing for short clips', () => {
    const videoLayer = createVideoLayer('video-layer', 'asset-video', 0, 1_000, 1_200);
    const imageLayer = createImageLayer('image-layer', 'asset-image', 1, 2_000, 5_000);
    const assets: EditorAsset[] = [
      {
        id: 'asset-video',
        name: 'video.mp4',
        type: 'VIDEO',
        url: '/video.mp4',
        thumbnailUrl: '/thumb.jpg',
      },
      {
        id: 'asset-image',
        name: 'image.png',
        type: 'IMAGE',
        url: '/image.png',
      },
    ];

    const [videoViewModel, imageViewModel] = buildTimelineClipViewModels({
      layers: [videoLayer, imageLayer],
      assets,
      selectedLayerIds: ['video-layer'],
      pxPerSecond: 24,
    });

    expect(videoViewModel).toMatchObject({
      layerId: 'video-layer',
      leftPx: 24,
      visualWidthPx: 14,
      selected: true,
      assetPreviewUrl: '/thumb.jpg',
      assetSourceUrl: '/video.mp4',
      thumbnailStripUrls: ['/thumb.jpg'],
    });
    expect(videoViewModel?.widthPx).toBeCloseTo(4.8);
    expect(imageViewModel?.assetPreviewUrl).toBe('/image.png');
    expect(imageViewModel?.assetSourceUrl).toBe('/image.png');
    expect(imageViewModel?.thumbnailStripUrls).toEqual(['/image.png']);
  });

  it('uses backend thumbnail strips for timeline filmstrip previews', () => {
    const videoLayer = createVideoLayer('video-layer', 'asset-video', 0, 0, 5000);
    const assets: EditorAsset[] = [
      {
        id: 'asset-video',
        name: 'video.mp4',
        type: 'VIDEO',
        url: '/video.mp4',
        thumbnailUrl: '/poster.jpg',
        thumbnails: ['/frame-1.jpg', '/frame-2.jpg'],
      },
    ];

    const [viewModel] = buildTimelineClipViewModels({
      layers: [videoLayer],
      assets,
      selectedLayerIds: [],
      pxPerSecond: 24,
    });

    expect(viewModel?.assetPreviewUrl).toBe('/poster.jpg');
    expect(viewModel?.thumbnailStripUrls).toEqual(['/frame-1.jpg', '/frame-2.jpg']);
  });

  it('uses readable text content in timeline clip view models', () => {
    const textLayer = createTextLayer('text-layer', '3 HAL YANG WAJIB TAU', 0, 0, 3000);
    const placeholderLayer = createTextLayer(
      'layer-subtitle-placeholder',
      'Subtitle text...',
      1,
      0,
      5000,
    );

    const [textViewModel, placeholderViewModel] = buildTimelineClipViewModels({
      layers: [textLayer, placeholderLayer],
      assets: [],
      selectedLayerIds: [],
      pxPerSecond: 24,
    });

    expect(textViewModel).toMatchObject({
      lane: 'Text',
      label: '3 HAL YANG WAJIB TAU',
      detail: 'Text',
    });
    expect(placeholderViewModel).toMatchObject({
      lane: 'Subtitle',
      label: 'Subtitle',
      detail: 'Subtitle',
    });
  });

  it('compacts technical export filenames for timeline labels', () => {
    expect(getCompactTimelineAssetName('clip.mp4')).toBe('clip');
    expect(getCompactTimelineAssetName('export-9dad4ab4_f801_4eac_bbde_6395adb6d9cd.mp4')).toBe(
      '9dad4ab4-f801-4e…95adb6d9cd',
    );
  });

  it('limits thumbnail tile counts for timeline clips', () => {
    expect(getTimelineThumbnailTileCount(0)).toBe(1);
    expect(getTimelineThumbnailTileCount(160)).toBe(3);
    expect(getTimelineThumbnailTileCount(5000)).toBe(18);
  });

  it('keeps short text clips labeled at the default timeline zoom', () => {
    expect(shouldShowTimelineClipLabel({ lane: 'Text', widthPx: 72 })).toBe(true);
    expect(shouldShowTimelineClipLabel({ lane: 'Subtitle', widthPx: 54 })).toBe(true);
    expect(shouldShowTimelineClipLabel({ lane: 'Video', widthPx: 72 })).toBe(false);
  });

  it('creates deterministic waveform fallback bars for audio clips', () => {
    expect(buildTimelineWaveformBars('audio-layer', 4)).toEqual(
      buildTimelineWaveformBars('audio-layer', 4),
    );
    expect(buildTimelineWaveformBars('audio-layer', 4)).toHaveLength(4);
    expect(buildTimelineWaveformBars('audio-layer', 1)[0]).toMatchObject({
      id: expect.stringContaining('audio-layer'),
      height: expect.any(Number),
    });
  });
});
