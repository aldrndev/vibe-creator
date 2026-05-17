import { useCallback } from 'react';
import type { EditorAsset } from '@/stores/editor-store';
import { useModernEditorStore } from '@/stores/modern-editor-store';

interface UseModernMediaImportOptions {
  readonly autoAddToCanvas?: boolean;
}

function resolveEditorAssetType(file: File): EditorAsset['type'] | null {
  if (file.type.startsWith('video')) {
    return 'VIDEO';
  }

  if (file.type.startsWith('image')) {
    return 'IMAGE';
  }

  if (file.type.startsWith('audio')) {
    return 'AUDIO';
  }

  return null;
}

function getSafeDurationMs(durationSec: number): number {
  return Number.isFinite(durationSec) && durationSec > 0 ? durationSec * 1000 : 5000;
}

function getSafeDimension(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function readTimedMediaMetadata(
  url: string,
  type: 'VIDEO' | 'AUDIO',
): Promise<Pick<EditorAsset, 'durationMs' | 'width' | 'height'>> {
  const element = document.createElement(type === 'VIDEO' ? 'video' : 'audio');
  element.src = url;

  return new Promise((resolve) => {
    element.onloadedmetadata = () => {
      resolve({
        durationMs: getSafeDurationMs(element.duration),
        width: type === 'VIDEO' ? getSafeDimension((element as HTMLVideoElement).videoWidth) : 0,
        height: type === 'VIDEO' ? getSafeDimension((element as HTMLVideoElement).videoHeight) : 0,
      });
    };
    element.onerror = () => resolve({ durationMs: 5000, width: 0, height: 0 });
  });
}

function readImageMetadata(
  url: string,
): Promise<Pick<EditorAsset, 'durationMs' | 'width' | 'height'>> {
  const image = new Image();
  image.src = url;

  return new Promise((resolve) => {
    image.onload = () => {
      resolve({
        durationMs: 5000,
        width: image.width,
        height: image.height,
      });
    };
    image.onerror = () => resolve({ durationMs: 5000, width: 0, height: 0 });
  });
}

async function createEditorAssetFromFile(file: File): Promise<EditorAsset | null> {
  const type = resolveEditorAssetType(file);
  if (!type) {
    return null;
  }

  const url = URL.createObjectURL(file);
  const metadata =
    type === 'IMAGE' ? await readImageMetadata(url) : await readTimedMediaMetadata(url, type);

  return {
    id: crypto.randomUUID(),
    name: file.name,
    type,
    url,
    file,
    ...metadata,
  };
}

function addAssetLayer(asset: EditorAsset): void {
  const store = useModernEditorStore.getState();

  if (asset.type === 'VIDEO') {
    store.addVideoLayer(asset.id);
    return;
  }

  if (asset.type === 'IMAGE') {
    store.addImageLayer(asset.id);
    return;
  }

  store.addAudioLayer(asset.id);
}

export function useModernMediaImport(options: UseModernMediaImportOptions = {}) {
  const addAsset = useModernEditorStore((state) => state.addAsset);
  const shouldAutoAdd = options.autoAddToCanvas === true;

  const importFiles = useCallback(
    async (files: FileList | File[]) => {
      const importedAssets: EditorAsset[] = [];

      for (const file of Array.from(files)) {
        const asset = await createEditorAssetFromFile(file);
        if (!asset) {
          continue;
        }

        addAsset(asset);
        importedAssets.push(asset);

        if (shouldAutoAdd) {
          addAssetLayer(asset);
        }
      }

      return importedAssets;
    },
    [addAsset, shouldAutoAdd],
  );

  return { importFiles };
}
