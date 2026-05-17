import { copyFile, mkdir } from 'node:fs/promises';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from '@/config/env';
import { writeStudioSfxWavFile } from './sfx-wav';
import type { ListStudioAssetsQuery, StudioAsset } from './video-studio.schemas';
import { studioAssetCatalog } from './video-studio-assets.catalog';

interface StudioAssetListResult {
  readonly items: StudioAsset[];
  readonly nextCursor: string | null;
  readonly hasMore: boolean;
}

const audioAssetRoot = resolve(dirname(fileURLToPath(import.meta.url)), 'audio-assets');

function normalizeSearch(value: string): string {
  return value.trim().toLowerCase();
}

function matchesSearch(asset: StudioAsset, query: string): boolean {
  const normalizedQuery = normalizeSearch(query);
  const searchable = [asset.title, asset.description, asset.category, ...asset.tags]
    .join(' ')
    .toLowerCase();

  return searchable.includes(normalizedQuery);
}

function getStudioAssetFileName(assetId: string): string {
  return `${assetId.replace(/[^a-z0-9-]/gi, '-')}.wav`;
}

function assertStudioAudioAsset(asset: StudioAsset | null): StudioAsset {
  if (!asset || asset.kind !== 'audio') {
    throw new Error('Studio audio asset not found');
  }

  return asset;
}

function resolveStudioAudioFile(fileName: string): string {
  const filePath = resolve(audioAssetRoot, fileName);
  const isInsideAudioRoot = filePath.startsWith(`${audioAssetRoot}${sep}`);

  if (!isInsideAudioRoot) {
    throw new Error('Invalid studio audio asset path');
  }

  return filePath;
}

/**
 * Returns the response MIME type for a catalog audio asset.
 */
export function getStudioAudioAssetMimeType(asset: StudioAsset): string {
  if (asset.kind !== 'audio') {
    throw new Error('Studio audio asset not found');
  }

  if (asset.payload.kind === 'audio-file') {
    return asset.payload.mimeType;
  }

  if (asset.payload.kind === 'audio-sfx') {
    return 'audio/wav';
  }

  throw new Error('Studio audio asset not found');
}

/**
 * Returns the file extension that should be used when persisting a studio audio asset.
 */
export function getStudioAudioAssetFileExtension(asset: StudioAsset): string {
  if (asset.kind !== 'audio') {
    throw new Error('Studio audio asset not found');
  }

  if (asset.payload.kind === 'audio-file') {
    return extname(asset.payload.fileName) || '.mp3';
  }

  if (asset.payload.kind === 'audio-sfx') {
    return '.wav';
  }

  throw new Error('Studio audio asset not found');
}

/**
 * Lists Video Studio catalog assets with deterministic cursor pagination.
 */
export function listStudioAssets(query: ListStudioAssetsQuery): StudioAssetListResult {
  const filtered = studioAssetCatalog.filter((asset) => {
    if (query.kind && asset.kind !== query.kind) {
      return false;
    }

    if (query.category && asset.category !== query.category) {
      return false;
    }

    if (query.q && !matchesSearch(asset, query.q)) {
      return false;
    }

    return true;
  });
  const startIndex = query.cursor
    ? Math.max(0, filtered.findIndex((asset) => asset.id === query.cursor) + 1)
    : 0;
  const items = filtered.slice(startIndex, startIndex + query.limit);
  const lastItem = items.at(-1);
  const hasMore = startIndex + query.limit < filtered.length;

  return {
    items,
    nextCursor: hasMore && lastItem ? lastItem.id : null,
    hasMore,
  };
}

/**
 * Returns one Video Studio catalog asset by stable ID.
 */
export function getStudioAsset(assetId: string): StudioAsset | null {
  return studioAssetCatalog.find((asset) => asset.id === assetId) ?? null;
}

/**
 * Resolves or creates a local audio file for a catalog audio asset.
 */
export async function materializeStudioAudioAsset(
  assetId: string,
  outputPath?: string,
): Promise<string> {
  const asset = assertStudioAudioAsset(getStudioAsset(assetId));

  if (asset.payload.kind === 'audio-file') {
    const sourcePath = resolveStudioAudioFile(asset.payload.fileName);

    if (!outputPath) {
      return sourcePath;
    }

    await mkdir(dirname(outputPath), { recursive: true });
    await copyFile(sourcePath, outputPath);
    return outputPath;
  }

  if (asset.payload.kind !== 'audio-sfx') {
    throw new Error('Studio audio asset not found');
  }

  const targetPath =
    outputPath ?? join(env.MEDIA_INPUT_DIR, 'studio-cache', getStudioAssetFileName(asset.id));
  await writeStudioSfxWavFile(asset.payload, targetPath);
  return targetPath;
}
