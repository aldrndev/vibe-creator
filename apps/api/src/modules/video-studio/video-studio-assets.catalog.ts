import type { StudioAsset } from './video-studio.schemas';
import { studioAudioAssets } from './video-studio-audio-assets';
import { studioElementAssets } from './video-studio-element-assets';
import { studioTextAssets } from './video-studio-text-assets';

/**
 * Single ordered source for the backend Video Studio asset catalog.
 */
export const studioAssetCatalog: StudioAsset[] = [
  ...studioTextAssets,
  ...studioElementAssets,
  ...studioAudioAssets,
].sort((left, right) => left.sortOrder - right.sortOrder || left.id.localeCompare(right.id));
