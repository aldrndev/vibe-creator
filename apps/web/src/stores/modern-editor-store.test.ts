import { createDefaultModernProject, type ModernProjectSettings } from '@vibe-creator/shared';
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

  it('infers the default project title from the first imported media asset', () => {
    useModernEditorStore
      .getState()
      .initProject('project-test', 'Untitled Project', { width: 1920, height: 1080 });

    useModernEditorStore.getState().addAsset({
      ...videoAsset,
      name: 'opening-scene_01.mp4',
    });

    expect(useModernEditorStore.getState().projectTitle).toBe('opening scene 01');
  });

  it('keeps a user-edited project title when importing media', () => {
    initProject();

    useModernEditorStore.getState().addAsset(videoAsset);

    expect(useModernEditorStore.getState().projectTitle).toBe('Project Test');
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

  it('splits selected video layers at the playhead and preserves source trim ranges', () => {
    initProject();

    useModernEditorStore.getState().addAsset(videoAsset);
    const layerId = useModernEditorStore.getState().addVideoLayer(videoAsset.id);
    useModernEditorStore.getState().setCurrentTime(2000);

    const splitLayerId = useModernEditorStore.getState().splitLayerAtPlayhead();
    expect(splitLayerId).toBeTruthy();

    const firstLayer = useModernEditorStore.getState().layersById[layerId];
    const secondLayer = splitLayerId
      ? useModernEditorStore.getState().layersById[splitLayerId]
      : null;

    expect(firstLayer?.endMs).toBe(2000);
    expect(secondLayer?.startMs).toBe(2000);

    if (firstLayer?.type !== 'video' || secondLayer?.type !== 'video') {
      throw new Error('Expected split video layers');
    }

    expect(firstLayer.data.trimEndMs).toBe(2000);
    expect(secondLayer.data.trimStartMs).toBe(2000);
  });

  it('updates source trim values when trimming timeline edges', () => {
    initProject();

    useModernEditorStore.getState().addAsset(videoAsset);
    const layerId = useModernEditorStore.getState().addVideoLayer(videoAsset.id);

    useModernEditorStore.getState().trimLayerTiming(layerId, 'start', 1000);
    let layer = useModernEditorStore.getState().layersById[layerId];
    if (layer?.type !== 'video') {
      throw new Error('Expected a video layer');
    }
    expect(layer.startMs).toBe(1000);
    expect(layer.data.trimStartMs).toBe(1000);

    useModernEditorStore.getState().trimLayerTiming(layerId, 'end', 2500);
    layer = useModernEditorStore.getState().layersById[layerId];
    if (layer?.type !== 'video') {
      throw new Error('Expected a video layer');
    }
    expect(layer.endMs).toBe(2500);
    expect(layer.data.trimEndMs).toBe(2500);
  });

  it('duplicates and deletes multi-selected layers together', () => {
    initProject();

    useModernEditorStore.getState().addAsset(videoAsset);
    const videoLayerId = useModernEditorStore.getState().addVideoLayer(videoAsset.id);
    const textLayerId = useModernEditorStore.getState().addTextLayer('CTA');

    useModernEditorStore.getState().selectLayer(videoLayerId);
    useModernEditorStore.getState().toggleLayerSelection(textLayerId);

    const duplicatedIds = useModernEditorStore.getState().duplicateSelectedLayers();
    expect(duplicatedIds).toHaveLength(2);
    expect(useModernEditorStore.getState().selectedLayerIds).toEqual(duplicatedIds);
    expect(useModernEditorStore.getState().getLayersSorted()).toHaveLength(4);

    useModernEditorStore.getState().deleteSelectedLayers();
    expect(useModernEditorStore.getState().getLayersSorted()).toHaveLength(2);
    expect(useModernEditorStore.getState().selectedLayerIds).toEqual([]);
  });

  it('reorders layers and keeps z-index values in sync', () => {
    initProject();

    useModernEditorStore.getState().addAsset(videoAsset);
    const videoLayerId = useModernEditorStore.getState().addVideoLayer(videoAsset.id);
    const titleLayerId = useModernEditorStore.getState().addTextLayer('Title');
    const ctaLayerId = useModernEditorStore.getState().addTextLayer('CTA');

    expect(useModernEditorStore.getState().layerOrder).toEqual([
      videoLayerId,
      titleLayerId,
      ctaLayerId,
    ]);

    useModernEditorStore.getState().reorderLayer(videoLayerId, 2);

    expect(useModernEditorStore.getState().layerOrder).toEqual([
      titleLayerId,
      ctaLayerId,
      videoLayerId,
    ]);
    expect(useModernEditorStore.getState().layersById[titleLayerId]?.zIndex).toBe(0);
    expect(useModernEditorStore.getState().layersById[ctaLayerId]?.zIndex).toBe(1);
    expect(useModernEditorStore.getState().layersById[videoLayerId]?.zIndex).toBe(2);
  });

  it('can replace a temporary local project ID after backend autosave', () => {
    initProject();

    useModernEditorStore.getState().setProjectId('server-project');

    expect(useModernEditorStore.getState().projectId).toBe('server-project');
    expect(useModernEditorStore.getState().getProject().id).toBe('server-project');
  });

  it('restores missing canvas settings from defaults when loading a draft', () => {
    const project = createDefaultModernProject('project-loaded', 'Loaded');
    const corruptedSettings = {
      ...project.settings,
      width: undefined,
      height: undefined,
      fps: undefined,
      backgroundColor: undefined,
    } as unknown as ModernProjectSettings;

    useModernEditorStore.getState().loadProject({ ...project, settings: corruptedSettings });

    expect(useModernEditorStore.getState().settings).toMatchObject({
      width: 1920,
      height: 1080,
      fps: 30,
      backgroundColor: '#000000',
      backgroundMode: 'blur',
    });
  });

  it('ignores undefined canvas setting updates instead of corrupting the store', () => {
    initProject();
    useModernEditorStore.getState().updateSettings({ width: 1080, height: 1920 });
    useModernEditorStore.getState().updateSettings({ width: undefined });

    expect(useModernEditorStore.getState().settings.width).toBe(1080);
    expect(useModernEditorStore.getState().settings.height).toBe(1920);
  });
});
