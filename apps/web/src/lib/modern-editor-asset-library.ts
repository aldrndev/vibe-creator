import type { EditorAsset } from '@/stores/editor-store';

export interface BackgroundImageAssetGroups {
  readonly backgroundUploads: EditorAsset[];
  readonly mediaImages: EditorAsset[];
}

export type BackgroundImagePickerSource = 'background' | 'media';

export function getImageBackgroundActivation(
  asset?: EditorAsset,
): { readonly backgroundImageAssetId: string; readonly backgroundMode: 'image' } | null {
  if (!asset || asset.type !== 'IMAGE') {
    return null;
  }

  return {
    backgroundMode: 'image',
    backgroundImageAssetId: asset.id,
  };
}

export function isMediaLibraryAsset(asset: EditorAsset): boolean {
  return asset.libraryPurpose !== 'background';
}

export function groupBackgroundImageAssets(
  assets: readonly EditorAsset[],
): BackgroundImageAssetGroups {
  const images = assets.filter((asset) => asset.type === 'IMAGE');

  return {
    backgroundUploads: images.filter((asset) => asset.libraryPurpose === 'background'),
    mediaImages: images.filter(isMediaLibraryAsset),
  };
}

export function resolveBackgroundImagePickerSource(
  activeAssetId: string | null | undefined,
  mediaImages: readonly EditorAsset[],
): BackgroundImagePickerSource {
  return mediaImages.some((asset) => asset.id === activeAssetId) ? 'media' : 'background';
}
