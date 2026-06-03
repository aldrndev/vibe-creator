/**
 * Modern Editor Store
 *
 * Normalized Zustand store for layer-based editing.
 * Single source of truth - no duplicate layer arrays.
 *
 * Architecture:
 * - `layersById` + `layerOrder` are canonical
 * - `ModernProject` is derived on save/compile
 */

import type { Layer, ModernProject, ModernProjectSettings } from '@vibe-creator/shared';
import {
  createAudioLayer,
  createImageLayer,
  createTextLayer,
  createVideoLayer,
  MODERN_SCHEMA_VERSION,
} from '@vibe-creator/shared';
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import {
  calculateMovedLayerTiming,
  calculateTrimmedLayerTiming,
  collectTimelineSnapPoints,
  MIN_LAYER_DURATION_MS,
  type TimelineTrimEdge,
} from '@/lib/modern-timeline-utils';
import type { EditorAsset } from './editor-store';
import {
  clamp,
  copyLayers,
  createProjectTitleFromAssetName,
  createSnapshot,
  DEFAULT_PROJECT_TITLE,
  generateId,
  getDefaultSettings,
  MAX_HISTORY_ENTRIES,
  type ModernEditorSnapshot,
  mergeModernProjectSettings,
  normalizeLayerUpdates,
  pushHistory,
  resolveModernProjectSettings,
} from './modern-editor-store-helpers';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface ModernEditorState {
  // Project metadata
  projectId: string;
  projectTitle: string;
  settings: ModernProjectSettings;

  // Canonical layer state (normalized)
  layersById: Record<string, Layer>;
  layerOrder: string[]; // z-order (first = bottom, last = top)

  // Assets
  assets: EditorAsset[];

  // Selection
  selectedLayerId: string | null;
  selectedLayerIds: string[];

  // Playback
  currentTimeMs: number;
  isPlaying: boolean;

  // UI state
  isDirty: boolean;
  isExporting: boolean;
  historyPast: ModernEditorSnapshot[];
  historyFuture: ModernEditorSnapshot[];
  canUndo: boolean;
  canRedo: boolean;

  // Actions
  initProject: (id: string, title: string, settings?: Partial<ModernProjectSettings>) => void;
  resetProject: () => void;
  loadProject: (project: ModernProject, assets?: EditorAsset[]) => void;
  setProjectId: (id: string) => void;
  setProjectTitle: (title: string) => void;
  markProjectSaved: () => void;
  undo: () => void;
  redo: () => void;

  // Asset actions
  addAsset: (asset: EditorAsset) => void;
  replaceAssets: (assets: EditorAsset[]) => void;
  removeAsset: (assetId: string) => void;

  // Layer actions
  addVideoLayer: (assetId: string) => string;
  addImageLayer: (assetId: string) => string;
  addTextLayer: (text: string) => string;
  addSubtitleLayer: (text: string) => string;
  addAudioLayer: (assetId: string) => string;
  removeLayer: (layerId: string) => void;
  updateLayer: (layerId: string, updates: Partial<Layer>) => void;
  reorderLayer: (layerId: string, newZIndex: number) => void;
  duplicateLayer: (layerId: string) => string | null;
  moveLayerTiming: (layerId: string, deltaMs: number) => void;
  trimLayerTiming: (layerId: string, edge: TimelineTrimEdge, targetMs: number) => void;
  splitLayerAtPlayhead: (layerId?: string) => string | null;
  duplicateSelectedLayers: () => string[];
  deleteSelectedLayers: () => void;

  // Selection
  selectLayer: (layerId: string | null) => void;
  toggleLayerSelection: (layerId: string) => void;
  clearLayerSelection: () => void;

  // Playback
  setCurrentTime: (timeMs: number) => void;
  play: () => void;
  pause: () => void;
  togglePlayback: () => void;

  // Settings
  updateSettings: (settings: Partial<ModernProjectSettings>) => void;

  // Derived
  getProject: () => ModernProject;
  getLayersSorted: () => Layer[];
  getSelectedLayer: () => Layer | null;
  getAsset: (assetId: string) => EditorAsset | undefined;
  getMaxEndMs: () => number;
}

function resolveSettingsWithAvailableAssets(
  settings: Partial<ModernProjectSettings>,
  assets: readonly EditorAsset[],
): ModernProjectSettings {
  const resolved = resolveModernProjectSettings(settings);
  if (resolved.backgroundMode !== 'image' || !resolved.backgroundImageAssetId) {
    return resolved;
  }

  const backgroundAsset = assets.find(
    (asset) => asset.id === resolved.backgroundImageAssetId && asset.type === 'IMAGE',
  );
  if (backgroundAsset) {
    return resolved;
  }

  return {
    ...resolved,
    backgroundMode: 'solid',
    backgroundColor: '#000000',
    backgroundImageAssetId: null,
  };
}

// -----------------------------------------------------------------------------
// Store
// -----------------------------------------------------------------------------

export const useModernEditorStore = create<ModernEditorState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    projectId: '',
    projectTitle: DEFAULT_PROJECT_TITLE,
    settings: getDefaultSettings(),

    layersById: {},
    layerOrder: [],

    assets: [],

    selectedLayerId: null,
    selectedLayerIds: [],

    currentTimeMs: 0,
    isPlaying: false,

    isDirty: false,
    isExporting: false,
    historyPast: [],
    historyFuture: [],
    canUndo: false,
    canRedo: false,

    // ---------------------------------------------------------------------
    // Project actions
    // ---------------------------------------------------------------------

    initProject: (id, title, settings) => {
      set({
        projectId: id,
        projectTitle: title.trim() || DEFAULT_PROJECT_TITLE,
        settings: resolveModernProjectSettings(settings),
        layersById: {},
        layerOrder: [],
        assets: [],
        selectedLayerId: null,
        selectedLayerIds: [],
        currentTimeMs: 0,
        isPlaying: false,
        isDirty: false,
        isExporting: false,
        historyPast: [],
        historyFuture: [],
        canUndo: false,
        canRedo: false,
      });
    },

    resetProject: () => {
      set({
        projectId: '',
        projectTitle: DEFAULT_PROJECT_TITLE,
        settings: getDefaultSettings(),
        layersById: {},
        layerOrder: [],
        assets: [],
        selectedLayerId: null,
        selectedLayerIds: [],
        currentTimeMs: 0,
        isPlaying: false,
        isDirty: false,
        isExporting: false,
        historyPast: [],
        historyFuture: [],
        canUndo: false,
        canRedo: false,
      });
    },

    loadProject: (project, assets = []) => {
      const layersById = Object.fromEntries(project.layers.map((layer) => [layer.id, layer]));
      set({
        projectId: project.id,
        projectTitle: project.title,
        settings: resolveSettingsWithAvailableAssets(project.settings, assets),
        layersById,
        layerOrder: project.layers.map((layer) => layer.id),
        assets,
        selectedLayerId: null,
        selectedLayerIds: [],
        currentTimeMs: 0,
        isPlaying: false,
        isDirty: false,
        isExporting: false,
        historyPast: [],
        historyFuture: [],
        canUndo: false,
        canRedo: false,
      });
    },

    setProjectId: (id) => {
      set({ projectId: id });
    },

    setProjectTitle: (title) => {
      const normalizedTitle = title.trim() || DEFAULT_PROJECT_TITLE;
      set((state) => ({
        ...pushHistory(state),
        projectTitle: normalizedTitle,
        isDirty: true,
      }));
    },

    markProjectSaved: () => {
      set({ isDirty: false });
    },

    undo: () => {
      set((state) => {
        const previous = state.historyPast.at(-1);
        if (!previous) return state;

        const future = [createSnapshot(state), ...state.historyFuture].slice(
          0,
          MAX_HISTORY_ENTRIES,
        );
        const historyPast = state.historyPast.slice(0, -1);

        return {
          ...previous,
          layersById: copyLayers(previous.layersById),
          layerOrder: [...previous.layerOrder],
          assets: [...previous.assets],
          settings: { ...previous.settings },
          historyPast,
          historyFuture: future,
          canUndo: historyPast.length > 0,
          canRedo: true,
        };
      });
    },

    redo: () => {
      set((state) => {
        const next = state.historyFuture[0];
        if (!next) return state;

        const historyPast = [...state.historyPast, createSnapshot(state)].slice(
          -MAX_HISTORY_ENTRIES,
        );
        const historyFuture = state.historyFuture.slice(1);

        return {
          ...next,
          layersById: copyLayers(next.layersById),
          layerOrder: [...next.layerOrder],
          assets: [...next.assets],
          settings: { ...next.settings },
          historyPast,
          historyFuture,
          canUndo: true,
          canRedo: historyFuture.length > 0,
        };
      });
    },

    // ---------------------------------------------------------------------
    // Asset actions
    // ---------------------------------------------------------------------

    addAsset: (asset) => {
      set((state) => {
        const shouldInferProjectTitle =
          state.assets.length === 0 && state.projectTitle.trim() === DEFAULT_PROJECT_TITLE;

        return {
          ...pushHistory(state),
          assets: [...state.assets, asset],
          projectTitle: shouldInferProjectTitle
            ? createProjectTitleFromAssetName(asset.name)
            : state.projectTitle,
          isDirty: true,
        };
      });
    },

    replaceAssets: (assets) => {
      set((state) => ({
        assets,
        settings: resolveSettingsWithAvailableAssets(state.settings, assets),
      }));
    },

    removeAsset: (assetId) => {
      set((state) => {
        const assets = state.assets.filter((a) => a.id !== assetId);
        return {
          ...pushHistory(state),
          assets,
          settings: resolveSettingsWithAvailableAssets(state.settings, assets),
          layersById: Object.fromEntries(
            Object.entries(state.layersById).filter(([, layer]) => layer.assetId !== assetId),
          ),
          layerOrder: state.layerOrder.filter((id) => state.layersById[id]?.assetId !== assetId),
          selectedLayerId:
            state.selectedLayerId && state.layersById[state.selectedLayerId]?.assetId === assetId
              ? null
              : state.selectedLayerId,
          selectedLayerIds: state.selectedLayerIds.filter(
            (id) => state.layersById[id]?.assetId !== assetId,
          ),
          isDirty: true,
        };
      });
    },

    // ---------------------------------------------------------------------
    // Layer actions
    // ---------------------------------------------------------------------

    addVideoLayer: (assetId) => {
      const state = get();
      const asset = state.assets.find((a) => a.id === assetId);
      if (!asset) return '';

      const id = `layer-video-${generateId()}`;
      const zIndex = state.layerOrder.length;
      const startMs = state.currentTimeMs; // Start at playhead
      const duration = asset.durationMs ?? 5000;

      const layer = createVideoLayer(id, assetId, zIndex, startMs, startMs + duration);

      set((s) => ({
        ...pushHistory(s),
        layersById: { ...s.layersById, [id]: layer },
        layerOrder: [...s.layerOrder, id],
        selectedLayerId: id,
        selectedLayerIds: [id],
        isDirty: true,
      }));

      return id;
    },

    addImageLayer: (assetId) => {
      const state = get();
      const asset = state.assets.find((a) => a.id === assetId);
      if (!asset) return '';

      const id = `layer-image-${generateId()}`;
      const zIndex = state.layerOrder.length;
      const startMs = state.currentTimeMs; // Start at playhead

      const layer = createImageLayer(id, assetId, zIndex, startMs, startMs + 5000);

      set((s) => ({
        ...pushHistory(s),
        layersById: { ...s.layersById, [id]: layer },
        layerOrder: [...s.layerOrder, id],
        selectedLayerId: id,
        selectedLayerIds: [id],
        isDirty: true,
      }));

      return id;
    },

    addTextLayer: (text) => {
      const state = get();
      const id = `layer-text-${generateId()}`;
      const zIndex = state.layerOrder.length;
      const startMs = state.currentTimeMs; // Start at playhead

      const layer = createTextLayer(id, text, zIndex, startMs, startMs + 5000);

      set((s) => ({
        ...pushHistory(s),
        layersById: { ...s.layersById, [id]: layer },
        layerOrder: [...s.layerOrder, id],
        selectedLayerId: id,
        selectedLayerIds: [id],
        isDirty: true,
      }));

      return id;
    },

    addAudioLayer: (assetId) => {
      const state = get();
      const asset = state.assets.find((a) => a.id === assetId);
      if (!asset) return '';

      const id = `layer-audio-${generateId()}`;
      const zIndex = state.layerOrder.length;
      const startMs = state.currentTimeMs; // Start at playhead
      const duration = asset.durationMs ?? 5000;

      const layer = createAudioLayer(id, assetId, zIndex, startMs, startMs + duration);

      set((s) => ({
        ...pushHistory(s),
        layersById: { ...s.layersById, [id]: layer },
        layerOrder: [...s.layerOrder, id],
        selectedLayerId: id,
        selectedLayerIds: [id],
        isDirty: true,
      }));

      return id;
    },

    addSubtitleLayer: (text) => {
      const state = get();
      const id = `layer-subtitle-${generateId()}`;
      const zIndex = state.layerOrder.length;
      const startMs = state.currentTimeMs;

      // Create text layer with subtitle-friendly defaults
      const layer = createTextLayer(id, text, zIndex, startMs, startMs + 5000);

      // Override with subtitle styling
      layer.x = 50; // Center horizontally
      layer.y = 85; // Bottom area
      layer.width = 90; // Wide
      layer.height = 12; // Compact height
      layer.data = {
        ...layer.data,
        text: text || 'Subtitle text...',
        fontFamily: 'Inter',
        fontSize: 32,
        fontWeight: 'bold',
        fontStyle: 'normal',
        color: '#ffffff',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        textAlign: 'center',
        animation: 'fade',
      };

      set((s) => ({
        ...pushHistory(s),
        layersById: { ...s.layersById, [id]: layer },
        layerOrder: [...s.layerOrder, id],
        selectedLayerId: id,
        selectedLayerIds: [id],
        isDirty: true,
      }));

      return id;
    },

    removeLayer: (layerId) => {
      set((state) => {
        const newLayersById = { ...state.layersById };
        delete newLayersById[layerId];

        return {
          ...pushHistory(state),
          layersById: newLayersById,
          layerOrder: state.layerOrder.filter((id) => id !== layerId),
          selectedLayerId: state.selectedLayerId === layerId ? null : state.selectedLayerId,
          selectedLayerIds: state.selectedLayerIds.filter((id) => id !== layerId),
          isDirty: true,
        };
      });
    },

    updateLayer: (layerId, updates) => {
      set((state) => {
        const layer = state.layersById[layerId];
        if (!layer) return state;
        if (layer.locked && updates.locked === undefined && updates.visible === undefined) {
          return state;
        }

        const normalizedUpdates = normalizeLayerUpdates(layer, updates);

        return {
          ...pushHistory(state),
          layersById: {
            ...state.layersById,
            [layerId]: { ...layer, ...normalizedUpdates } as Layer,
          },
          isDirty: true,
        };
      });
    },

    reorderLayer: (layerId, newZIndex) => {
      set((state) => {
        const currentIndex = state.layerOrder.indexOf(layerId);
        if (currentIndex === -1) return state;

        const newOrder = [...state.layerOrder];
        newOrder.splice(currentIndex, 1);
        newOrder.splice(clamp(newZIndex, 0, newOrder.length), 0, layerId);

        // Update zIndex for all layers
        const newLayersById = { ...state.layersById };
        newOrder.forEach((id, index) => {
          if (newLayersById[id]) {
            newLayersById[id] = { ...newLayersById[id], zIndex: index };
          }
        });

        return {
          ...pushHistory(state),
          layerOrder: newOrder,
          layersById: newLayersById,
          isDirty: true,
        };
      });
    },

    duplicateLayer: (layerId) => {
      const state = get();
      const layer = state.layersById[layerId];
      if (!layer) return null;

      const newId = `layer-${layer.type}-${generateId()}`;
      const newLayer: Layer = {
        ...layer,
        id: newId,
        zIndex: state.layerOrder.length,
        x: layer.x + 5,
        y: layer.y + 5,
      } as Layer;

      set((s) => ({
        ...pushHistory(s),
        layersById: { ...s.layersById, [newId]: newLayer },
        layerOrder: [...s.layerOrder, newId],
        selectedLayerId: newId,
        selectedLayerIds: [newId],
        isDirty: true,
      }));

      return newId;
    },

    moveLayerTiming: (layerId, deltaMs) => {
      set((state) => {
        const layer = state.layersById[layerId];
        if (!layer || layer.locked) return state;

        const selectedIds = state.selectedLayerIds.includes(layerId)
          ? state.selectedLayerIds
          : [layerId];
        const selectedSet = new Set(selectedIds);
        const snapPoints = collectTimelineSnapPoints(
          Object.values(state.layersById),
          state.currentTimeMs,
          selectedSet,
        );
        const anchorTiming = calculateMovedLayerTiming({ layer, deltaMs, snapPoints });
        const appliedDeltaMs = anchorTiming.startMs - layer.startMs;
        const layersById = { ...state.layersById };

        selectedIds.forEach((id) => {
          const selectedLayer = layersById[id];
          if (!selectedLayer || selectedLayer.locked) return;
          const moved = calculateMovedLayerTiming({
            layer: selectedLayer,
            deltaMs: appliedDeltaMs,
            snapPoints: [],
          });
          layersById[id] = { ...selectedLayer, ...moved } as Layer;
        });

        return {
          ...pushHistory(state),
          layersById,
          isDirty: true,
        };
      });
    },

    trimLayerTiming: (layerId, edge, targetMs) => {
      set((state) => {
        const layer = state.layersById[layerId];
        if (!layer || layer.locked) return state;

        const snapPoints = collectTimelineSnapPoints(
          Object.values(state.layersById),
          state.currentTimeMs,
          new Set([layerId]),
        );
        const trimmed = calculateTrimmedLayerTiming({ layer, edge, targetMs, snapPoints });
        const updates: Partial<Layer> = { ...trimmed };

        if (edge === 'start' && (layer.type === 'video' || layer.type === 'audio')) {
          const deltaMs = trimmed.startMs - layer.startMs;
          updates.data = {
            ...layer.data,
            trimStartMs: Math.max(0, layer.data.trimStartMs + deltaMs),
          } as Layer['data'];
        }

        if (edge === 'end' && (layer.type === 'video' || layer.type === 'audio')) {
          const visibleDurationMs = trimmed.endMs - layer.startMs;
          updates.data = {
            ...layer.data,
            trimEndMs: Math.max(layer.data.trimStartMs, layer.data.trimStartMs + visibleDurationMs),
          } as Layer['data'];
        }

        return {
          ...pushHistory(state),
          layersById: {
            ...state.layersById,
            [layerId]: { ...layer, ...normalizeLayerUpdates(layer, updates) } as Layer,
          },
          selectedLayerId: layerId,
          selectedLayerIds: [layerId],
          isDirty: true,
        };
      });
    },

    splitLayerAtPlayhead: (layerId) => {
      const state = get();
      const targetLayerId = layerId ?? state.selectedLayerId;
      if (!targetLayerId) return null;

      const layer = state.layersById[targetLayerId];
      if (!layer || layer.locked) return null;

      const splitMs = state.currentTimeMs;
      if (
        splitMs <= layer.startMs + MIN_LAYER_DURATION_MS ||
        splitMs >= layer.endMs - MIN_LAYER_DURATION_MS
      ) {
        return null;
      }

      const newId = `layer-${layer.type}-${generateId()}`;
      const splitOffsetMs = splitMs - layer.startMs;
      const firstLayer = { ...layer, endMs: splitMs } as Layer;
      const secondLayer = {
        ...layer,
        id: newId,
        startMs: splitMs,
        zIndex: state.layerOrder.length,
        x: layer.x + 3,
        y: layer.y + 3,
        data: { ...layer.data },
      } as Layer;

      if (layer.type === 'video' || layer.type === 'audio') {
        firstLayer.data = {
          ...layer.data,
          trimEndMs: layer.data.trimStartMs + splitOffsetMs,
        } as Layer['data'];
        secondLayer.data = {
          ...layer.data,
          trimStartMs: layer.data.trimStartMs + splitOffsetMs,
        } as Layer['data'];
      }

      set((s) => ({
        ...pushHistory(s),
        layersById: {
          ...s.layersById,
          [targetLayerId]: firstLayer,
          [newId]: secondLayer,
        },
        layerOrder: [...s.layerOrder, newId],
        selectedLayerId: newId,
        selectedLayerIds: [newId],
        isDirty: true,
      }));

      return newId;
    },

    duplicateSelectedLayers: () => {
      const state = get();
      const selectedIds = state.selectedLayerIds.length > 0 ? state.selectedLayerIds : [];
      const duplicatedIds: string[] = [];

      selectedIds.forEach((layerId) => {
        const newId = get().duplicateLayer(layerId);
        if (newId) {
          duplicatedIds.push(newId);
        }
      });

      if (duplicatedIds.length > 1) {
        set({ selectedLayerId: duplicatedIds.at(-1) ?? null, selectedLayerIds: duplicatedIds });
      }

      return duplicatedIds;
    },

    deleteSelectedLayers: () => {
      set((state) => {
        const selectedSet = new Set(state.selectedLayerIds);
        if (selectedSet.size === 0) return state;

        return {
          ...pushHistory(state),
          layersById: Object.fromEntries(
            Object.entries(state.layersById).filter(([id]) => !selectedSet.has(id)),
          ),
          layerOrder: state.layerOrder.filter((id) => !selectedSet.has(id)),
          selectedLayerId: null,
          selectedLayerIds: [],
          isDirty: true,
        };
      });
    },

    // ---------------------------------------------------------------------
    // Selection
    // ---------------------------------------------------------------------

    selectLayer: (layerId) => {
      set({ selectedLayerId: layerId, selectedLayerIds: layerId ? [layerId] : [] });
    },

    toggleLayerSelection: (layerId) => {
      set((state) => {
        const isSelected = state.selectedLayerIds.includes(layerId);
        const selectedLayerIds = isSelected
          ? state.selectedLayerIds.filter((id) => id !== layerId)
          : [...state.selectedLayerIds, layerId];

        return {
          selectedLayerIds,
          selectedLayerId: selectedLayerIds.at(-1) ?? null,
        };
      });
    },

    clearLayerSelection: () => {
      set({ selectedLayerId: null, selectedLayerIds: [] });
    },

    // ---------------------------------------------------------------------
    // Playback
    // ---------------------------------------------------------------------

    setCurrentTime: (timeMs) => {
      set({ currentTimeMs: Math.max(0, timeMs) });
    },

    play: () =>
      set((state) => ({
        currentTimeMs: state.currentTimeMs >= state.getMaxEndMs() ? 0 : state.currentTimeMs,
        isPlaying: true,
      })),
    pause: () => set({ isPlaying: false }),
    togglePlayback: () =>
      set((state) => {
        const maxEndMs = state.getMaxEndMs();
        if (state.isPlaying) {
          return { isPlaying: false };
        }

        return {
          currentTimeMs: maxEndMs > 0 && state.currentTimeMs >= maxEndMs ? 0 : state.currentTimeMs,
          isPlaying: true,
        };
      }),

    // ---------------------------------------------------------------------
    // Settings
    // ---------------------------------------------------------------------

    updateSettings: (settings) => {
      set((state) => ({
        ...pushHistory(state),
        settings: mergeModernProjectSettings(state.settings, settings),
        isDirty: true,
      }));
    },

    // ---------------------------------------------------------------------
    // Derived getters
    // ---------------------------------------------------------------------

    getProject: () => {
      const state = get();
      const layers = state.getLayersSorted();
      const maxEnd = state.getMaxEndMs();

      return {
        schemaVersion: MODERN_SCHEMA_VERSION,
        id: state.projectId,
        title: state.projectTitle,
        settings: {
          ...state.settings,
          durationMs: maxEnd,
        },
        layers,
      };
    },

    getLayersSorted: () => {
      const state = get();
      return state.layerOrder
        .map((id) => state.layersById[id])
        .filter((layer): layer is Layer => Boolean(layer));
    },

    getSelectedLayer: () => {
      const state = get();
      if (!state.selectedLayerId) return null;
      return state.layersById[state.selectedLayerId] ?? null;
    },

    getAsset: (assetId) => {
      return get().assets.find((a) => a.id === assetId);
    },

    getMaxEndMs: () => {
      const state = get();
      let maxEnd = 0;
      for (const layer of Object.values(state.layersById)) {
        if (layer.endMs > maxEnd) {
          maxEnd = layer.endMs;
        }
      }
      return maxEnd;
    },
  })),
);

// -----------------------------------------------------------------------------
// Selectors (for memoized access)
// -----------------------------------------------------------------------------

export const selectLayersSorted = (state: ModernEditorState) => state.getLayersSorted();
export const selectSelectedLayer = (state: ModernEditorState) => state.getSelectedLayer();
export const selectProject = (state: ModernEditorState) => state.getProject();
export const selectAssets = (state: ModernEditorState) => state.assets;
export const selectSettings = (state: ModernEditorState) => state.settings;
export const selectCurrentTime = (state: ModernEditorState) => state.currentTimeMs;
export const selectIsPlaying = (state: ModernEditorState) => state.isPlaying;
