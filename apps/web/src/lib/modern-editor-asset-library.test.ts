import { describe, expect, it } from 'vitest';
import type { EditorAsset } from '@/stores/editor-store';
import {
  getImageBackgroundActivation,
  groupBackgroundImageAssets,
  isMediaLibraryAsset,
  resolveBackgroundImagePickerSource,
} from './modern-editor-asset-library';

const legacyMediaImage: EditorAsset = {
  id: 'legacy-image',
  name: 'legacy.jpg',
  type: 'IMAGE',
  url: '/legacy.jpg',
};

describe('modern editor asset library purpose', () => {
  it('keeps legacy assets and regular media in the media library', () => {
    expect(isMediaLibraryAsset(legacyMediaImage)).toBe(true);
    expect(isMediaLibraryAsset({ ...legacyMediaImage, libraryPurpose: 'media' })).toBe(true);
    expect(isMediaLibraryAsset({ ...legacyMediaImage, libraryPurpose: 'background' })).toBe(false);
  });

  it('separates background uploads from selectable media images', () => {
    const backgroundUpload: EditorAsset = {
      ...legacyMediaImage,
      id: 'background',
      libraryPurpose: 'background',
    };
    const audio: EditorAsset = {
      id: 'audio',
      name: 'voice.wav',
      type: 'AUDIO',
      url: '/voice.wav',
      libraryPurpose: 'media',
    };

    expect(groupBackgroundImageAssets([legacyMediaImage, backgroundUpload, audio])).toEqual({
      backgroundUploads: [backgroundUpload],
      mediaImages: [legacyMediaImage],
    });
  });

  it('requires a selected image before activating image background mode', () => {
    expect(getImageBackgroundActivation()).toBeNull();
    expect(getImageBackgroundActivation(legacyMediaImage)).toEqual({
      backgroundMode: 'image',
      backgroundImageAssetId: 'legacy-image',
    });
  });

  it('opens the picker on media images only when the active background comes from media', () => {
    expect(resolveBackgroundImagePickerSource('legacy-image', [legacyMediaImage])).toBe('media');
    expect(resolveBackgroundImagePickerSource('background-upload', [legacyMediaImage])).toBe(
      'background',
    );
    expect(resolveBackgroundImagePickerSource(null, [legacyMediaImage])).toBe('background');
  });
});
