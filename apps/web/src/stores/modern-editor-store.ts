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
import type { EditorAsset } from './editor-store';
import {
  clamp,
  copyLayers,
  createSnapshot,
  generateId,
  getDefaultSettings,
  MAX_HISTORY_ENTRIES,
  type ModernEditorSnapshot,
  normalizeLayerUpdates,
  normalizeSettings,
  pushHistory,
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
  undo: () => void;
  redo: () => void;

  // Asset actions
  addAsset: (asset: EditorAsset) => void;
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

  // Selection
  selectLayer: (layerId: string | null) => void;

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

// -----------------------------------------------------------------------------
// Store
// -----------------------------------------------------------------------------

export const useModernEditorStore = create<ModernEditorState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    projectId: '',
    projectTitle: 'Untitled Project',
    settings: getDefaultSettings(),

    layersById: {},
    layerOrder: [],

    assets: [],

    selectedLayerId: null,

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
        projectTitle: title,
        settings: { ...getDefaultSettings(), ...settings },
        layersById: {},
        layerOrder: [],
        assets: [],
        selectedLayerId: null,
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
        projectTitle: 'Untitled Project',
        settings: getDefaultSettings(),
        layersById: {},
        layerOrder: [],
        assets: [],
        selectedLayerId: null,
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
      set((state) => ({
        ...pushHistory(state),
        assets: [...state.assets, asset],
        isDirty: true,
      }));
    },

    removeAsset: (assetId) => {
      set((state) => ({
        ...pushHistory(state),
        assets: state.assets.filter((a) => a.id !== assetId),
        layersById: Object.fromEntries(
          Object.entries(state.layersById).filter(([, layer]) => layer.assetId !== assetId),
        ),
        layerOrder: state.layerOrder.filter((id) => state.layersById[id]?.assetId !== assetId),
        selectedLayerId:
          state.selectedLayerId && state.layersById[state.selectedLayerId]?.assetId === assetId
            ? null
            : state.selectedLayerId,
        isDirty: true,
      }));
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
        isDirty: true,
      }));

      return newId;
    },

    // ---------------------------------------------------------------------
    // Selection
    // ---------------------------------------------------------------------

    selectLayer: (layerId) => {
      set({ selectedLayerId: layerId });
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
        settings: { ...state.settings, ...normalizeSettings(settings) },
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
