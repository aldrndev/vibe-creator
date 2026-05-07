import { afterEach, describe, expect, it } from 'vitest';
import type { EditorAsset } from '@/stores/editor-store';
import { useModernEditorStore } from '@/stores/modern-editor-store';

const videoAsset: EditorAsset = {
  id: 'asset-video-1',
  name: 'clip.mp4',
  type: 'VIDEO',
  url: '/uploads/temp/clip.mp4',
  durationMs: 4000,
  width: 1920,
  height: 1080,
};

const imageAsset: EditorAsset = {
  id: 'asset-image-1',
  name: 'frame.png',
  type: 'IMAGE',
  url: '/uploads/temp/frame.png',
  width: 1080,
  height: 1080,
};

function initProject() {
  useModernEditorStore.getState().initProject('project-test', 'Project Test');
}

describe('modern editor store', () => {
  afterEach(() => {
    useModernEditorStore.getState().resetProject();
  });

  it('adds assets to the modern layer model and supports undo and redo', () => {
    initProject();

    useModernEditorStore.getState().addAsset(videoAsset);
    const layerId = useModernEditorStore.getState().addVideoLayer(videoAsset.id);

    expect(layerId).toBeTruthy();
    expect(useModernEditorStore.getState().assets).toHaveLength(1);
    expect(useModernEditorStore.getState().getLayersSorted()).toHaveLength(1);
    expect(useModernEditorStore.getState().selectedLayerId).toBe(layerId);
    expect(useModernEditorStore.getState().canUndo).toBe(true);

    useModernEditorStore.getState().undo();
    expect(useModernEditorStore.getState().getLayersSorted()).toHaveLength(0);
    expect(useModernEditorStore.getState().canRedo).toBe(true);

    useModernEditorStore.getState().redo();
    expect(useModernEditorStore.getState().getLayersSorted()).toHaveLength(1);
    expect(useModernEditorStore.getState().selectedLayerId).toBe(layerId);
  });

  it('removes layers that reference a deleted asset', () => {
    initProject();

    useModernEditorStore.getState().addAsset(imageAsset);
    const layerId = useModernEditorStore.getState().addImageLayer(imageAsset.id);

    expect(useModernEditorStore.getState().layersById[layerId]).toBeDefined();

    useModernEditorStore.getState().removeAsset(imageAsset.id);

    expect(useModernEditorStore.getState().assets).toHaveLength(0);
    expect(useModernEditorStore.getState().layersById[layerId]).toBeUndefined();
    expect(useModernEditorStore.getState().layerOrder).not.toContain(layerId);
  });

  it('keeps locked layers from changing transform values until unlocked', () => {
    initProject();

    const layerId = useModernEditorStore.getState().addTextLayer('Locked title');
    useModernEditorStore.getState().updateLayer(layerId, { locked: true });
    useModernEditorStore.getState().updateLayer(layerId, { x: 80 });

    expect(useModernEditorStore.getState().layersById[layerId]?.x).toBe(50);

    useModernEditorStore.getState().updateLayer(layerId, { locked: false });
    useModernEditorStore.getState().updateLayer(layerId, { x: 80 });

    expect(useModernEditorStore.getState().layersById[layerId]?.x).toBe(80);
  });
});
