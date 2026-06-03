import type { Layer } from '@vibe-creator/shared';
import type { EditorAsset } from '@/stores/editor-store';

export type EditorMediaPreviewKind = EditorAsset['type'] | 'TEXT';

export interface EditorMediaWaveformBar {
  readonly id: string;
  readonly height: number;
}

export function resolveEditorAssetPreviewUrl(asset?: EditorAsset | null): string | null {
  if (!asset) {
    return null;
  }

  if (asset.thumbnailUrl) {
    return asset.thumbnailUrl;
  }

  if (asset.thumbnails?.[0]) {
    return asset.thumbnails[0];
  }

  if (asset.type === 'IMAGE') {
    return asset.url;
  }

  return null;
}

export function resolveEditorMediaPreviewKind({
  asset,
  layer,
}: Readonly<{
  asset?: EditorAsset | null;
  layer?: Layer | null;
}>): EditorMediaPreviewKind {
  if (asset) {
    return asset.type;
  }

  if (layer?.type === 'text') {
    return 'TEXT';
  }

  if (layer?.type === 'audio') {
    return 'AUDIO';
  }

  if (layer?.type === 'image') {
    return 'IMAGE';
  }

  return 'VIDEO';
}

export function buildEditorMediaWaveformBars(seed: string, count = 24): EditorMediaWaveformBar[] {
  let hash = 0;
  for (const char of seed) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }

  return Array.from({ length: count }, (_, index) => {
    const shifted = (hash >>> (index % 16)) ^ (index * 2_654_435_761);
    return {
      id: `${seed}-${index.toString(36)}-${shifted.toString(36)}`,
      height: 24 + (shifted % 68),
    };
  });
}

export function getWaveformBarHeightClass(height: number): string {
  if (height >= 84) {
    return 'h-8';
  }

  if (height >= 68) {
    return 'h-7';
  }

  if (height >= 52) {
    return 'h-6';
  }

  if (height >= 36) {
    return 'h-5';
  }

  return 'h-4';
}
