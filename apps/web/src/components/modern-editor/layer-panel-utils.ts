import type { Layer } from '@vibe-creator/shared';
import type { EditorAsset } from '@/stores/editor-store';

const SUBTITLE_LAYER_ID_PATTERN = /^layer-subtitle-/;
const TEXT_PLACEHOLDER_LABELS = new Set(['Text layer', 'Subtitle text...']);

/**
 * Resolves the short display label used by the Video Studio layer panels.
 */
export function getLayerDisplayName(layer: Layer, assets: readonly EditorAsset[]): string {
  if (layer.type === 'text') {
    return getTextLayerPreviewLabel(layer).slice(0, 42);
  }

  if (layer.assetId) {
    const asset = assets.find((item) => item.id === layer.assetId);
    if (asset?.name) {
      return asset.name;
    }
  }

  return `${getLayerTypeLabel(layer.type)} Layer`;
}

/**
 * Returns the primary layer-stack title. Text layers keep a stable type label so
 * the editable copy can live in the secondary line without making the stack jumpy.
 */
export function getLayerStackTitle(layer: Layer, assets: readonly EditorAsset[]): string {
  if (layer.type === 'text') {
    return getTextLayerFallbackLabel(layer);
  }

  return getLayerDisplayName(layer, assets);
}

/**
 * Returns the compact fallback label for empty text thumbnails and titles.
 */
export function getTextLayerFallbackLabel(layer: Layer): string {
  return layer.type === 'text' && SUBTITLE_LAYER_ID_PATTERN.test(layer.id) ? 'Subtitle' : 'Text';
}

/**
 * Returns the layer-list text label without exposing editor placeholder copy.
 */
export function getTextLayerPreviewLabel(layer: Layer): string {
  if (layer.type !== 'text') {
    return getLayerTypeLabel(layer.type);
  }

  const text = layer.data.text.trim();
  if (!text || TEXT_PLACEHOLDER_LABELS.has(text)) {
    return getTextLayerFallbackLabel(layer);
  }

  return text;
}

/**
 * Human label for compact layer-type metadata.
 */
export function getLayerTypeLabel(type: Layer['type']): string {
  if (type === 'video') {
    return 'Video';
  }

  if (type === 'image') {
    return 'Image';
  }

  if (type === 'audio') {
    return 'Audio';
  }

  return 'Text';
}

/**
 * Compact seconds/minutes formatter for timeline labels.
 */
export function formatLayerTime(ms: number): string {
  const safeMs = Number.isFinite(ms) ? Math.max(0, ms) : 0;
  const totalSeconds = safeMs / 1000;

  if (totalSeconds < 60) {
    return `${totalSeconds.toFixed(1)}s`;
  }

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Returns the visible layer duration in a compact label.
 */
export function formatLayerDuration(layer: Layer): string {
  return formatLayerTime(layer.endMs - layer.startMs);
}
