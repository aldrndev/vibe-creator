import { createDefaultModernProject } from '@vibe-creator/shared';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createModernEditorStoredAssetFiles,
  createSerializableModernEditorAssets,
  getModernEditorDrafts,
  loadLatestModernEditorDraft,
  restoreModernEditorDraftAssets,
  saveModernEditorDraft,
} from '@/lib/modern-editor-drafts';
import type { EditorAsset } from '@/stores/editor-store';

const imageAsset: EditorAsset = {
  id: 'asset-image',
  name: 'image.png',
  type: 'IMAGE',
  url: 'blob:image',
};

function createMemoryStorage(): Storage {
  const data = new Map<string, string>();

  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key: string) => data.get(key) ?? null,
    key: (index: number) => [...data.keys()][index] ?? null,
    removeItem: (key: string) => data.delete(key),
    setItem: (key: string, value: string) => data.set(key, value),
  };
}

function stubDraftStorage(storage = createMemoryStorage()): Storage {
  vi.stubGlobal('window', {
    localStorage: storage,
  });

  return storage;
}

describe('modern editor drafts', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('saves and loads the latest local draft', () => {
    stubDraftStorage();
    const project = createDefaultModernProject('project-draft', 'Draft Project');

    const draft = saveModernEditorDraft(project, [imageAsset]);
    const latest = loadLatestModernEditorDraft();

    expect(draft.title).toBe('Draft Project');
    expect(latest?.project.id).toBe('project-draft');
    expect(latest?.assets).toEqual([imageAsset]);
  });

  it('returns an empty list for invalid stored draft data', () => {
    const storage = stubDraftStorage();
    storage.setItem('vibe:video-studio:drafts', '{invalid');

    expect(getModernEditorDrafts()).toEqual([]);
  });

  it('serializes draft assets without File objects', () => {
    const file = new File(['video'], 'clip.mp4', { type: 'video/mp4' });
    const asset: EditorAsset = {
      id: 'asset-video',
      name: 'clip.mp4',
      type: 'VIDEO',
      url: 'blob:clip',
      file,
    };

    const [serializableAsset] = createSerializableModernEditorAssets([asset]);
    const [storedFile] = createModernEditorStoredAssetFiles([asset]);

    expect(serializableAsset).toEqual({
      id: 'asset-video',
      name: 'clip.mp4',
      type: 'VIDEO',
      url: 'blob:clip',
    });
    expect(storedFile?.assetId).toBe('asset-video');
    expect(storedFile?.file).toBe(file);
  });

  it('restores draft asset files with fresh object URLs', () => {
    const file = new File(['image'], 'image.png', { type: 'image/png' });
    const createObjectUrl = vi.fn(() => 'blob:restored-image');
    vi.stubGlobal('URL', {
      createObjectURL: createObjectUrl,
    });

    const [restoredAsset] = restoreModernEditorDraftAssets(
      [imageAsset],
      [{ assetId: imageAsset.id, file }],
    );

    expect(restoredAsset).toEqual({
      ...imageAsset,
      file,
      url: 'blob:restored-image',
    });
    expect(createObjectUrl).toHaveBeenCalledWith(file);
  });
});
