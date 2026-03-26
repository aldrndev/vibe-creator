import type { ClipEffects, ClipTransforms } from '@vibe-creator/shared';
import type { EditorAsset, EditorClip, EditorTrack } from '@/stores/editor-store';

const DEFAULT_DURATION_MS = 5000;
const DEFAULT_TRANSFORMS: ClipTransforms = {
  x: 0,
  y: 0,
  scale: 1,
  rotation: 0,
  opacity: 1,
};
const DEFAULT_EFFECTS: ClipEffects = {
  filters: [],
  speed: 1,
  volume: 1,
  fadeIn: 0,
  fadeOut: 0,
};

interface ImportedAssetMetadata {
  durationMs: number;
  width?: number;
  height?: number;
}

function isVideoFile(file: File): boolean {
  return file.type.startsWith('video/');
}

function isAudioFile(file: File): boolean {
  return file.type.startsWith('audio/');
}

function isImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}

/**
 * Returns the editor asset type for supported browser-uploaded media.
 */
export function getImportedAssetType(file: File): EditorAsset['type'] | null {
  if (isVideoFile(file)) {
    return 'VIDEO';
  }

  if (isAudioFile(file)) {
    return 'AUDIO';
  }

  if (isImageFile(file)) {
    return 'IMAGE';
  }

  return null;
}

/**
 * Reads browser metadata needed for timeline placement.
 */
export async function loadImportedAssetMetadata(
  file: File,
  url: string,
): Promise<ImportedAssetMetadata> {
  if (isVideoFile(file) || isAudioFile(file)) {
    const media = document.createElement(isVideoFile(file) ? 'video' : 'audio');
    media.src = url;

    return new Promise<ImportedAssetMetadata>((resolve) => {
      media.onloadedmetadata = () => {
        resolve({
          durationMs: media.duration * 1000,
          width: media instanceof HTMLVideoElement ? media.videoWidth : undefined,
          height: media instanceof HTMLVideoElement ? media.videoHeight : undefined,
        });
      };
    });
  }

  if (isImageFile(file)) {
    const image = new Image();
    image.src = url;

    return new Promise<ImportedAssetMetadata>((resolve) => {
      image.onload = () => {
        resolve({
          durationMs: DEFAULT_DURATION_MS,
          width: image.width,
          height: image.height,
        });
      };
    });
  }

  return { durationMs: DEFAULT_DURATION_MS };
}

/**
 * Creates the editor asset record while preserving the current file-storage behavior.
 */
export function createImportedAsset(
  file: File,
  url: string,
  metadata: ImportedAssetMetadata,
): EditorAsset {
  const assetType = getImportedAssetType(file);
  if (!assetType) {
    throw new Error(`Unsupported asset type: ${file.type}`);
  }

  return {
    id: crypto.randomUUID(),
    name: file.name,
    type: assetType,
    url,
    file: assetType === 'VIDEO' ? file : undefined,
    durationMs: metadata.durationMs,
    width: metadata.width,
    height: metadata.height,
  };
}

/**
 * Finds the end time of the latest clip on a track.
 */
export function getTrackLastClipEndMs(track: EditorTrack | undefined): number {
  if (!track || track.clips.length === 0) {
    return 0;
  }

  return Math.max(...track.clips.map((clip) => clip.endMs));
}

/**
 * Creates the default clip payload used by the editor timeline.
 */
export function createImportedClip(
  asset: EditorAsset,
  startMs: number,
  overrides?: Partial<Omit<EditorClip, 'id' | 'assetId' | 'startMs' | 'endMs'>>,
): Omit<EditorClip, 'id'> {
  return {
    assetId: asset.id,
    startMs,
    endMs: startMs + (asset.durationMs ?? DEFAULT_DURATION_MS),
    trimStartMs: 0,
    trimEndMs: 0,
    transforms: DEFAULT_TRANSFORMS,
    effects: DEFAULT_EFFECTS,
    asset,
    ...overrides,
  };
}

export function createLinkedAudioAsset(asset: EditorAsset): EditorAsset {
  return {
    id: `${asset.id}-audio`,
    name: `${asset.name} (Audio)`,
    type: 'AUDIO',
    url: asset.url,
    durationMs: asset.durationMs,
  };
}
