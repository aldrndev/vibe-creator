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

import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type {
  ModernProject,
  ModernProjectSettings,
  Layer,
  AllowedFps,
} from "@vibe-creator/shared";
import {
  MODERN_SCHEMA_VERSION,
  MODERN_LIMITS,
  createVideoLayer,
  createImageLayer,
  createTextLayer,
  createAudioLayer,
} from "@vibe-creator/shared";
import type { EditorAsset } from "./editor-store";

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

  // Actions
  initProject: (
    id: string,
    title: string,
    settings?: Partial<ModernProjectSettings>
  ) => void;
  resetProject: () => void;

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
// Helpers
// -----------------------------------------------------------------------------

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function getDefaultSettings(): ModernProjectSettings {
  const resolution =
    MODERN_LIMITS.ALLOWED_RESOLUTIONS[MODERN_LIMITS.DEFAULT_RESOLUTION];
  return {
    width: resolution.width,
    height: resolution.height,
    fps: MODERN_LIMITS.DEFAULT_FPS as AllowedFps,
    durationMs: 0,
    backgroundColor: "#000000",
  };
}

// -----------------------------------------------------------------------------
// Store
// -----------------------------------------------------------------------------

export const useModernEditorStore = create<ModernEditorState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    projectId: "",
    projectTitle: "Untitled Project",
    settings: getDefaultSettings(),

    layersById: {},
    layerOrder: [],

    assets: [],

    selectedLayerId: null,

    currentTimeMs: 0,
    isPlaying: false,

    isDirty: false,
    isExporting: false,

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
      });
    },

    resetProject: () => {
      set({
        projectId: "",
        projectTitle: "Untitled Project",
        settings: getDefaultSettings(),
        layersById: {},
        layerOrder: [],
        assets: [],
        selectedLayerId: null,
        currentTimeMs: 0,
        isPlaying: false,
        isDirty: false,
        isExporting: false,
      });
    },

    // ---------------------------------------------------------------------
    // Asset actions
    // ---------------------------------------------------------------------

    addAsset: (asset) => {
      set((state) => ({
        assets: [...state.assets, asset],
      }));
    },

    removeAsset: (assetId) => {
      set((state) => ({
        assets: state.assets.filter((a) => a.id !== assetId),
      }));
    },

    // ---------------------------------------------------------------------
    // Layer actions
    // ---------------------------------------------------------------------

    addVideoLayer: (assetId) => {
      const state = get();
      const asset = state.assets.find((a) => a.id === assetId);
      if (!asset) return "";

      const id = `layer-video-${generateId()}`;
      const zIndex = state.layerOrder.length;
      const startMs = state.currentTimeMs; // Start at playhead
      const duration = asset.durationMs ?? 5000;

      const layer = createVideoLayer(
        id,
        assetId,
        zIndex,
        startMs,
        startMs + duration
      );

      set((s) => ({
        layersById: { ...s.layersById, [id]: layer },
        layerOrder: [...s.layerOrder, id],
        isDirty: true,
      }));

      return id;
    },

    addImageLayer: (assetId) => {
      const state = get();
      const asset = state.assets.find((a) => a.id === assetId);
      if (!asset) return "";

      const id = `layer-image-${generateId()}`;
      const zIndex = state.layerOrder.length;
      const startMs = state.currentTimeMs; // Start at playhead

      const layer = createImageLayer(
        id,
        assetId,
        zIndex,
        startMs,
        startMs + 5000
      );

      set((s) => ({
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
      if (!asset) return "";

      const id = `layer-audio-${generateId()}`;
      const zIndex = state.layerOrder.length;
      const startMs = state.currentTimeMs; // Start at playhead
      const duration = asset.durationMs ?? 5000;

      const layer = createAudioLayer(
        id,
        assetId,
        zIndex,
        startMs,
        startMs + duration
      );

      set((s) => ({
        layersById: { ...s.layersById, [id]: layer },
        layerOrder: [...s.layerOrder, id],
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
        text: text || "Subtitle text...",
        fontFamily: "Inter",
        fontSize: 32,
        fontWeight: "bold",
        fontStyle: "normal",
        color: "#ffffff",
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        textAlign: "center",
        animation: "fade",
      };

      set((s) => ({
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
          layersById: newLayersById,
          layerOrder: state.layerOrder.filter((id) => id !== layerId),
          selectedLayerId:
            state.selectedLayerId === layerId ? null : state.selectedLayerId,
          isDirty: true,
        };
      });
    },

    updateLayer: (layerId, updates) => {
      set((state) => {
        const layer = state.layersById[layerId];
        if (!layer) return state;

        return {
          layersById: {
            ...state.layersById,
            [layerId]: { ...layer, ...updates } as Layer,
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
        newOrder.splice(newZIndex, 0, layerId);

        // Update zIndex for all layers
        const newLayersById = { ...state.layersById };
        newOrder.forEach((id, index) => {
          if (newLayersById[id]) {
            newLayersById[id] = { ...newLayersById[id], zIndex: index };
          }
        });

        return {
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

    play: () => set({ isPlaying: true }),
    pause: () => set({ isPlaying: false }),
    togglePlayback: () => set((s) => ({ isPlaying: !s.isPlaying })),

    // ---------------------------------------------------------------------
    // Settings
    // ---------------------------------------------------------------------

    updateSettings: (settings) => {
      set((state) => ({
        settings: { ...state.settings, ...settings },
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
  }))
);

// -----------------------------------------------------------------------------
// Selectors (for memoized access)
// -----------------------------------------------------------------------------

export const selectLayersSorted = (state: ModernEditorState) =>
  state.getLayersSorted();
export const selectSelectedLayer = (state: ModernEditorState) =>
  state.getSelectedLayer();
export const selectProject = (state: ModernEditorState) => state.getProject();
export const selectAssets = (state: ModernEditorState) => state.assets;
export const selectSettings = (state: ModernEditorState) => state.settings;
export const selectCurrentTime = (state: ModernEditorState) =>
  state.currentTimeMs;
export const selectIsPlaying = (state: ModernEditorState) => state.isPlaying;
