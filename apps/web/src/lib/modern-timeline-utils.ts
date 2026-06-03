import type { Layer } from '@vibe-creator/shared';
import {
  buildEditorMediaWaveformBars,
  resolveEditorAssetPreviewUrl,
} from '@/lib/modern-editor-media-preview';
import type { EditorAsset } from '@/stores/editor-store';

export const MIN_LAYER_DURATION_MS = 100;
export const TIMELINE_SNAP_THRESHOLD_MS = 150;
export const TIMELINE_NUDGE_MS = 250;
export const TIMELINE_DEFAULT_PX_PER_SECOND = 24;
export const TIMELINE_MIN_PX_PER_SECOND = 8;
export const TIMELINE_MAX_PX_PER_SECOND = 120;
export const TIMELINE_MIN_DURATION_MS = 15_000;
export const TIMELINE_TAIL_PADDING_MS = 1_000;
export const TIMELINE_MIN_CLIP_WIDTH_PX = 14;
export const TIMELINE_MIN_LABEL_WIDTH_PX = 74;
export const TIMELINE_MIN_TEXT_LABEL_WIDTH_PX = 54;
const TEXT_PLACEHOLDER_LABELS = new Set(['Text layer', 'Subtitle text...']);

export type TimelineTrimEdge = 'start' | 'end';

export interface TimelineZoomConfig {
  readonly pxPerSecond: number;
  readonly min: number;
  readonly max: number;
}

export interface TimelineClipViewModel {
  readonly layerId: string;
  readonly lane: TimelineLayerLabel;
  readonly label: string;
  readonly detail: string;
  readonly startMs: number;
  readonly endMs: number;
  readonly leftPx: number;
  readonly widthPx: number;
  readonly visualWidthPx: number;
  readonly selected: boolean;
  readonly assetPreviewUrl: string | null;
  readonly assetSourceUrl: string | null;
  readonly thumbnailStripUrls: readonly string[];
  readonly waveformBars: readonly TimelineWaveformBar[];
}

export interface TimelineRulerTick {
  readonly timeMs: number;
  readonly leftPx: number;
  readonly label: string;
  readonly major: boolean;
}

export interface TimelineWaveformBar {
  readonly id: string;
  readonly height: number;
}

export type TimelineLayerLabel = 'Video' | 'Image' | 'Text' | 'Subtitle' | 'Audio';

export interface TimelineSnapInput {
  readonly valueMs: number;
  readonly snapPoints: readonly number[];
  readonly thresholdMs?: number;
}

export interface TimelineMoveInput {
  readonly layer: Layer;
  readonly deltaMs: number;
  readonly snapPoints: readonly number[];
  readonly minStartMs?: number;
}

export interface TimelineTrimInput {
  readonly layer: Layer;
  readonly edge: TimelineTrimEdge;
  readonly targetMs: number;
  readonly snapPoints: readonly number[];
}

export interface TimelineReorderTargetInput {
  readonly clientY: number;
  readonly containerTopPx: number;
  readonly rowHeightPx: number;
  readonly layerIds: readonly string[];
  readonly draggedLayerId: string;
  readonly pointerStartY: number;
  readonly activationDistancePx?: number;
}

export interface TimelineNavigatorThumbMetrics {
  readonly scrollable: boolean;
  readonly thumbLeftPx: number;
  readonly thumbWidthPx: number;
}

export interface TimelineNavigatorInput {
  readonly scrollLeftPx: number;
  readonly scrollWidthPx: number;
  readonly viewportWidthPx: number;
  readonly trackWidthPx: number;
  readonly minThumbWidthPx?: number;
}

export interface TimelineAutoScrollInput {
  readonly pointerClientX: number;
  readonly viewportLeftPx: number;
  readonly viewportRightPx: number;
  readonly edgePaddingPx?: number;
  readonly maxStepPx?: number;
}

export interface TimelineEnsureVisibleInput {
  readonly timeLeftPx: number;
  readonly scrollLeftPx: number;
  readonly scrollWidthPx: number;
  readonly viewportWidthPx: number;
  readonly paddingPx?: number;
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.max(min, Math.min(max, value));
}

export function clampTimelineZoom(pxPerSecond: number): number {
  return clamp(pxPerSecond, TIMELINE_MIN_PX_PER_SECOND, TIMELINE_MAX_PX_PER_SECOND);
}

export function timelineMsToPx(ms: number, pxPerSecond: number): number {
  return (Math.max(0, ms) / 1000) * clampTimelineZoom(pxPerSecond);
}

export function timelinePxToMs(px: number, pxPerSecond: number): number {
  return (px / clampTimelineZoom(pxPerSecond)) * 1000;
}

export function getTimelineMaxScrollLeft(scrollWidthPx: number, viewportWidthPx: number): number {
  return Math.max(0, scrollWidthPx - viewportWidthPx);
}

export function clampTimelineScrollLeft(
  scrollLeftPx: number,
  scrollWidthPx: number,
  viewportWidthPx: number,
): number {
  return clamp(scrollLeftPx, 0, getTimelineMaxScrollLeft(scrollWidthPx, viewportWidthPx));
}

export function getTimelineNavigatorThumbMetrics({
  minThumbWidthPx = 36,
  scrollLeftPx,
  scrollWidthPx,
  trackWidthPx,
  viewportWidthPx,
}: TimelineNavigatorInput): TimelineNavigatorThumbMetrics {
  if (trackWidthPx <= 0 || scrollWidthPx <= viewportWidthPx || viewportWidthPx <= 0) {
    return {
      scrollable: false,
      thumbLeftPx: 0,
      thumbWidthPx: Math.max(0, trackWidthPx),
    };
  }

  const maxScrollLeftPx = getTimelineMaxScrollLeft(scrollWidthPx, viewportWidthPx);
  const thumbWidthPx = clamp(
    (viewportWidthPx / scrollWidthPx) * trackWidthPx,
    Math.min(minThumbWidthPx, trackWidthPx),
    trackWidthPx,
  );
  const travelWidthPx = Math.max(1, trackWidthPx - thumbWidthPx);
  const thumbLeftPx =
    (clampTimelineScrollLeft(scrollLeftPx, scrollWidthPx, viewportWidthPx) / maxScrollLeftPx) *
    travelWidthPx;

  return {
    scrollable: true,
    thumbLeftPx,
    thumbWidthPx,
  };
}

export function getTimelineScrollLeftFromNavigatorPoint({
  minThumbWidthPx,
  pointerX,
  scrollWidthPx,
  trackLeftPx,
  trackWidthPx,
  viewportWidthPx,
}: Readonly<
  Omit<TimelineNavigatorInput, 'scrollLeftPx'> & {
    readonly pointerX: number;
    readonly trackLeftPx: number;
  }
>): number {
  const maxScrollLeftPx = getTimelineMaxScrollLeft(scrollWidthPx, viewportWidthPx);
  if (maxScrollLeftPx <= 0 || trackWidthPx <= 0) {
    return 0;
  }

  const { thumbWidthPx } = getTimelineNavigatorThumbMetrics({
    scrollLeftPx: 0,
    scrollWidthPx,
    viewportWidthPx,
    trackWidthPx,
    minThumbWidthPx,
  });
  const travelWidthPx = Math.max(1, trackWidthPx - thumbWidthPx);
  const targetThumbLeftPx = clamp(pointerX - trackLeftPx - thumbWidthPx / 2, 0, travelWidthPx);

  return clampTimelineScrollLeft(
    (targetThumbLeftPx / travelWidthPx) * maxScrollLeftPx,
    scrollWidthPx,
    viewportWidthPx,
  );
}

export function getTimelineScrollLeftFromNavigatorThumbDrag({
  deltaX,
  minThumbWidthPx,
  scrollWidthPx,
  startScrollLeftPx,
  trackWidthPx,
  viewportWidthPx,
}: Readonly<
  Omit<TimelineNavigatorInput, 'scrollLeftPx'> & {
    readonly deltaX: number;
    readonly startScrollLeftPx: number;
  }
>): number {
  const maxScrollLeftPx = getTimelineMaxScrollLeft(scrollWidthPx, viewportWidthPx);
  if (maxScrollLeftPx <= 0 || trackWidthPx <= 0) {
    return 0;
  }

  const { thumbWidthPx } = getTimelineNavigatorThumbMetrics({
    scrollLeftPx: startScrollLeftPx,
    scrollWidthPx,
    viewportWidthPx,
    trackWidthPx,
    minThumbWidthPx,
  });
  const travelWidthPx = Math.max(1, trackWidthPx - thumbWidthPx);

  return clampTimelineScrollLeft(
    startScrollLeftPx + (deltaX / travelWidthPx) * maxScrollLeftPx,
    scrollWidthPx,
    viewportWidthPx,
  );
}

export function getTimelineAutoScrollDelta({
  edgePaddingPx = 56,
  maxStepPx = 28,
  pointerClientX,
  viewportLeftPx,
  viewportRightPx,
}: TimelineAutoScrollInput): number {
  if (viewportRightPx <= viewportLeftPx || edgePaddingPx <= 0 || maxStepPx <= 0) {
    return 0;
  }

  if (pointerClientX < viewportLeftPx + edgePaddingPx) {
    const intensity = (viewportLeftPx + edgePaddingPx - pointerClientX) / edgePaddingPx;
    return -Math.ceil(clamp(intensity, 0, 1) * maxStepPx);
  }

  if (pointerClientX > viewportRightPx - edgePaddingPx) {
    const intensity = (pointerClientX - (viewportRightPx - edgePaddingPx)) / edgePaddingPx;
    return Math.ceil(clamp(intensity, 0, 1) * maxStepPx);
  }

  return 0;
}

export function getTimelineScrollLeftToShowTime({
  paddingPx = 80,
  scrollLeftPx,
  scrollWidthPx,
  timeLeftPx,
  viewportWidthPx,
}: TimelineEnsureVisibleInput): number {
  if (viewportWidthPx <= 0) {
    return clampTimelineScrollLeft(scrollLeftPx, scrollWidthPx, viewportWidthPx);
  }

  const clampedPaddingPx = Math.min(Math.max(0, paddingPx), viewportWidthPx / 2);
  const leftBoundaryPx = scrollLeftPx + clampedPaddingPx;
  const rightBoundaryPx = scrollLeftPx + viewportWidthPx - clampedPaddingPx;

  if (timeLeftPx < leftBoundaryPx) {
    return clampTimelineScrollLeft(timeLeftPx - clampedPaddingPx, scrollWidthPx, viewportWidthPx);
  }

  if (timeLeftPx > rightBoundaryPx) {
    return clampTimelineScrollLeft(
      timeLeftPx - viewportWidthPx + clampedPaddingPx,
      scrollWidthPx,
      viewportWidthPx,
    );
  }

  return clampTimelineScrollLeft(scrollLeftPx, scrollWidthPx, viewportWidthPx);
}

export function formatTimelineTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const centiseconds = Math.floor((Math.max(0, ms) % 1000) / 10);
  return `${minutes}:${seconds.toString().padStart(2, '0')}.${centiseconds
    .toString()
    .padStart(2, '0')}`;
}

export function formatTimelineTick(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function getTimelineDurationMs(maxLayerEndMs: number): number {
  return Math.max(TIMELINE_MIN_DURATION_MS, maxLayerEndMs + TIMELINE_TAIL_PADDING_MS);
}

export function getTimelineTickStepMs(pxPerSecond: number): number {
  const normalizedZoom = clampTimelineZoom(pxPerSecond);

  if (normalizedZoom >= 72) {
    return 1_000;
  }

  if (normalizedZoom >= 36) {
    return 2_000;
  }

  if (normalizedZoom >= 16) {
    return 5_000;
  }

  return 10_000;
}

export function buildTimelineRulerTicks(
  durationMs: number,
  pxPerSecond: number,
): TimelineRulerTick[] {
  const stepMs = getTimelineTickStepMs(pxPerSecond);
  const ticks: TimelineRulerTick[] = [];

  for (let timeMs = 0; timeMs <= durationMs; timeMs += stepMs) {
    ticks.push({
      timeMs,
      leftPx: timelineMsToPx(timeMs, pxPerSecond),
      label: formatTimelineTick(timeMs),
      major: timeMs % (stepMs * 2) === 0,
    });
  }

  return ticks;
}

export function collectTimelineSnapPoints(
  layers: readonly Layer[],
  currentTimeMs: number,
  ignoredLayerIds: ReadonlySet<string> = new Set(),
): number[] {
  const points = new Set<number>([0, currentTimeMs]);

  layers.forEach((layer) => {
    if (ignoredLayerIds.has(layer.id)) {
      return;
    }

    points.add(layer.startMs);
    points.add(layer.endMs);
  });

  return [...points].sort((a, b) => a - b);
}

export function getTimelineReorderTargetLayerId({
  clientY,
  containerTopPx,
  rowHeightPx,
  layerIds,
  draggedLayerId,
  pointerStartY,
  activationDistancePx = rowHeightPx / 3,
}: TimelineReorderTargetInput): string | null {
  if (layerIds.length === 0 || rowHeightPx <= 0) {
    return null;
  }

  if (Math.abs(clientY - pointerStartY) < activationDistancePx) {
    return null;
  }

  const rowIndex = clamp(
    Math.floor((clientY - containerTopPx) / rowHeightPx),
    0,
    layerIds.length - 1,
  );
  const targetLayerId = layerIds[rowIndex];

  return targetLayerId && targetLayerId !== draggedLayerId ? targetLayerId : null;
}

export function getTimelineLayerLabel(layer: Layer): TimelineLayerLabel {
  if (layer.type === 'video') {
    return 'Video';
  }

  if (layer.type === 'image') {
    return 'Image';
  }

  if (layer.type === 'audio') {
    return 'Audio';
  }

  return layer.id.includes('subtitle') ? 'Subtitle' : 'Text';
}

export function getTimelineClipLabel(layer: Layer, asset?: EditorAsset): string {
  if (layer.type === 'text') {
    const text = layer.data.text.trim();
    if (!text || TEXT_PLACEHOLDER_LABELS.has(text)) {
      return getTimelineLayerLabel(layer);
    }

    return text;
  }

  return asset?.name ? getCompactTimelineAssetName(asset.name) : getTimelineLayerLabel(layer);
}

export function getTimelineAssetPreviewUrl(layer: Layer, asset?: EditorAsset): string | null {
  if (!asset || layer.type === 'audio') {
    return null;
  }

  return resolveEditorAssetPreviewUrl(asset);
}

export function getTimelineAssetSourceUrl(layer: Layer, asset?: EditorAsset): string | null {
  if (!asset || (layer.type !== 'video' && layer.type !== 'image')) {
    return null;
  }

  return asset.url;
}

export function getTimelineThumbnailStripUrls(layer: Layer, asset?: EditorAsset): string[] {
  if (!asset || (layer.type !== 'video' && layer.type !== 'image')) {
    return [];
  }

  if (asset.thumbnails?.length) {
    return asset.thumbnails;
  }

  const previewUrl = getTimelineAssetPreviewUrl(layer, asset);
  return previewUrl ? [previewUrl] : [];
}

export function buildTimelineWaveformBars(seed: string, count = 24): TimelineWaveformBar[] {
  return buildEditorMediaWaveformBars(seed, count);
}

export function getCompactTimelineAssetName(name: string): string {
  const baseName = name
    .replace(/\.[a-z0-9]{1,8}$/i, '')
    .replace(/^export[-_]/i, '')
    .replace(/[_]+/g, '-')
    .trim();

  if (baseName.length <= 34) {
    return baseName || name;
  }

  return `${baseName.slice(0, 16)}…${baseName.slice(-10)}`;
}

export function getTimelineThumbnailTileCount(widthPx: number): number {
  if (widthPx <= 0) {
    return 1;
  }

  return clamp(Math.ceil(widthPx / 78), 1, 18);
}

export function shouldShowTimelineClipLabel({
  lane,
  widthPx,
}: Readonly<{ lane: TimelineLayerLabel; widthPx: number }>): boolean {
  const minWidth =
    lane === 'Text' || lane === 'Subtitle'
      ? TIMELINE_MIN_TEXT_LABEL_WIDTH_PX
      : TIMELINE_MIN_LABEL_WIDTH_PX;

  return widthPx >= minWidth;
}

export function buildTimelineClipViewModels({
  layers,
  assets,
  selectedLayerIds,
  pxPerSecond,
}: {
  readonly layers: readonly Layer[];
  readonly assets: readonly EditorAsset[];
  readonly selectedLayerIds: readonly string[];
  readonly pxPerSecond: number;
}): TimelineClipViewModel[] {
  const selectedSet = new Set(selectedLayerIds);

  return layers.map((layer) => {
    const asset = layer.assetId
      ? assets.find((candidate) => candidate.id === layer.assetId)
      : undefined;
    const widthPx = timelineMsToPx(layer.endMs - layer.startMs, pxPerSecond);
    const lane = getTimelineLayerLabel(layer);

    return {
      layerId: layer.id,
      lane,
      label: getTimelineClipLabel(layer, asset),
      detail: lane,
      startMs: layer.startMs,
      endMs: layer.endMs,
      leftPx: timelineMsToPx(layer.startMs, pxPerSecond),
      widthPx,
      visualWidthPx: Math.max(TIMELINE_MIN_CLIP_WIDTH_PX, widthPx),
      selected: selectedSet.has(layer.id),
      assetPreviewUrl: getTimelineAssetPreviewUrl(layer, asset),
      assetSourceUrl: getTimelineAssetSourceUrl(layer, asset),
      thumbnailStripUrls: getTimelineThumbnailStripUrls(layer, asset),
      waveformBars: layer.type === 'audio' ? buildTimelineWaveformBars(layer.id) : [],
    };
  });
}

export function snapTimelineTime({
  valueMs,
  snapPoints,
  thresholdMs = TIMELINE_SNAP_THRESHOLD_MS,
}: TimelineSnapInput): number {
  let nearest = valueMs;
  let nearestDistance = thresholdMs + 1;

  snapPoints.forEach((point) => {
    const distance = Math.abs(point - valueMs);
    if (distance < nearestDistance) {
      nearest = point;
      nearestDistance = distance;
    }
  });

  return nearestDistance <= thresholdMs ? nearest : valueMs;
}

export function calculateMovedLayerTiming({
  layer,
  deltaMs,
  snapPoints,
  minStartMs = 0,
}: TimelineMoveInput): Pick<Layer, 'startMs' | 'endMs'> {
  const durationMs = Math.max(MIN_LAYER_DURATION_MS, layer.endMs - layer.startMs);
  const rawStartMs = Math.max(minStartMs, layer.startMs + deltaMs);
  const snappedStartMs = snapTimelineTime({ valueMs: rawStartMs, snapPoints });

  return {
    startMs: Math.max(minStartMs, snappedStartMs),
    endMs: Math.max(minStartMs, snappedStartMs) + durationMs,
  };
}

export function calculateTrimmedLayerTiming({
  layer,
  edge,
  targetMs,
  snapPoints,
}: TimelineTrimInput): Pick<Layer, 'startMs' | 'endMs'> {
  const snappedTargetMs = snapTimelineTime({ valueMs: targetMs, snapPoints });

  if (edge === 'start') {
    return {
      startMs: clamp(snappedTargetMs, 0, layer.endMs - MIN_LAYER_DURATION_MS),
      endMs: layer.endMs,
    };
  }

  return {
    startMs: layer.startMs,
    endMs: Math.max(layer.startMs + MIN_LAYER_DURATION_MS, snappedTargetMs),
  };
}

export function isEditableInputTarget(target: EventTarget | null): boolean {
  if (typeof HTMLElement === 'undefined' || !(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName.toLowerCase();
  return (
    tagName === 'input' ||
    tagName === 'textarea' ||
    tagName === 'select' ||
    target.isContentEditable
  );
}
