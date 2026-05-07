import type { AllowedFps, Layer, ModernProjectSettings } from '@vibe-creator/shared';
import { MODERN_LIMITS } from '@vibe-creator/shared';
import type { EditorAsset } from './editor-store';

export interface ModernEditorSnapshot {
  projectId: string;
  projectTitle: string;
  settings: ModernProjectSettings;
  layersById: Record<string, Layer>;
  layerOrder: string[];
  assets: EditorAsset[];
  selectedLayerId: string | null;
  currentTimeMs: number;
  isDirty: boolean;
}

interface SnapshotSource extends ModernEditorSnapshot {
  historyPast: ModernEditorSnapshot[];
}

export const MAX_HISTORY_ENTRIES = 50;
const MIN_CANVAS_SIZE = 320;
const MAX_CANVAS_SIZE = 4096;

export function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function getDefaultSettings(): ModernProjectSettings {
  const resolution = MODERN_LIMITS.ALLOWED_RESOLUTIONS[MODERN_LIMITS.DEFAULT_RESOLUTION];
  return {
    width: resolution.width,
    height: resolution.height,
    fps: MODERN_LIMITS.DEFAULT_FPS as AllowedFps,
    durationMs: 0,
    backgroundColor: '#000000',
  };
}

export function createSnapshot(state: SnapshotSource): ModernEditorSnapshot {
  return {
    projectId: state.projectId,
    projectTitle: state.projectTitle,
    settings: { ...state.settings },
    layersById: copyLayers(state.layersById),
    layerOrder: [...state.layerOrder],
    assets: [...state.assets],
    selectedLayerId: state.selectedLayerId,
    currentTimeMs: state.currentTimeMs,
    isDirty: state.isDirty,
  };
}

export function copyLayers(layersById: Record<string, Layer>): Record<string, Layer> {
  return Object.fromEntries(
    Object.entries(layersById).map(([id, layer]) => [id, copyLayer(layer)]),
  );
}

function copyLayer(layer: Layer): Layer {
  return {
    ...layer,
    data: { ...layer.data },
  } as Layer;
}

export function pushHistory(state: SnapshotSource) {
  const past = [...state.historyPast, createSnapshot(state)].slice(-MAX_HISTORY_ENTRIES);

  return {
    historyPast: past,
    historyFuture: [],
    canUndo: past.length > 0,
    canRedo: false,
  };
}

export function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

export function normalizeSettings(
  settings: Partial<ModernProjectSettings>,
): Partial<ModernProjectSettings> {
  return {
    ...settings,
    width:
      settings.width === undefined
        ? undefined
        : Math.round(clamp(settings.width, MIN_CANVAS_SIZE, MAX_CANVAS_SIZE)),
    height:
      settings.height === undefined
        ? undefined
        : Math.round(clamp(settings.height, MIN_CANVAS_SIZE, MAX_CANVAS_SIZE)),
    durationMs:
      settings.durationMs === undefined
        ? undefined
        : clamp(settings.durationMs, 0, MODERN_LIMITS.MAX_DURATION_MS),
  };
}

export function normalizeLayerUpdates(layer: Layer, updates: Partial<Layer>): Partial<Layer> {
  const normalized: Partial<Layer> = { ...updates };

  if (updates.x !== undefined) normalized.x = clamp(updates.x, -100, 200);
  if (updates.y !== undefined) normalized.y = clamp(updates.y, -100, 200);
  if (updates.width !== undefined) normalized.width = clamp(updates.width, 1, 200);
  if (updates.height !== undefined) normalized.height = clamp(updates.height, 1, 200);
  if (updates.rotation !== undefined) normalized.rotation = clamp(updates.rotation, -360, 360);
  if (updates.opacity !== undefined) normalized.opacity = clamp(updates.opacity, 0, 1);

  const startMs = normalized.startMs ?? layer.startMs;
  const endMs = normalized.endMs ?? layer.endMs;

  if (normalized.startMs !== undefined) {
    normalized.startMs = clamp(startMs, 0, MODERN_LIMITS.MAX_DURATION_MS);
  }

  if (normalized.endMs !== undefined) {
    normalized.endMs = clamp(endMs, Math.max(100, startMs + 100), MODERN_LIMITS.MAX_DURATION_MS);
  }

  return normalized;
}
