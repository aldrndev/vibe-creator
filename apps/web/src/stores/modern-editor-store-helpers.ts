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
  selectedLayerIds: string[];
  currentTimeMs: number;
  isDirty: boolean;
}

interface SnapshotSource extends ModernEditorSnapshot {
  historyPast: ModernEditorSnapshot[];
}

export const MAX_HISTORY_ENTRIES = 50;
/** Default project title shown before the editor can infer a better name. */
export const DEFAULT_PROJECT_TITLE = 'Untitled Project';
const MIN_CANVAS_SIZE = 320;
const MAX_CANVAS_SIZE = 4096;
const LAYER_TRANSFORM_DECIMAL_FACTOR = 100;
const FILE_EXTENSION_PATTERN = /\.[^./\\]+$/;
const READABLE_FILENAME_SEPARATOR_PATTERN = /[_-]+/g;
const COLLAPSED_WHITESPACE_PATTERN = /\s+/g;

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
    backgroundMode: 'blur',
    backgroundOpacity: 1,
    backgroundBlurAmount: 18,
    backgroundBlurZoom: 1.08,
    backgroundDim: 0.08,
    backgroundSaturation: 1.05,
    backgroundGradientFrom: '#111827',
    backgroundGradientTo: '#ff4b1f',
    backgroundGradientAngle: 135,
    backgroundImageAssetId: null,
    backgroundImageFit: 'cover',
    backgroundImageBlurAmount: 0,
    backgroundImageDim: 0,
    backgroundImagePositionX: 50,
    backgroundImagePositionY: 50,
    backgroundImageScale: 1,
  };
}

function resolveFps(
  fps: Partial<ModernProjectSettings>['fps'],
  fallback: ModernProjectSettings['fps'],
): ModernProjectSettings['fps'] {
  if (MODERN_LIMITS.ALLOWED_FPS.some((allowedFps) => allowedFps === fps) && fps !== undefined) {
    return fps;
  }

  return fallback;
}

function mergeValue<T>(update: T | undefined, base: T | undefined, fallback: T): T {
  return update ?? base ?? fallback;
}

function mergeString(
  update: string | undefined,
  base: string | undefined,
  fallback: string,
): string {
  return update?.trim() || base || fallback;
}

export function mergeModernProjectSettings(
  baseSettings: ModernProjectSettings,
  updates: Partial<ModernProjectSettings> = {},
): ModernProjectSettings {
  const normalizedUpdates = normalizeSettings(updates);
  return {
    width: normalizedUpdates.width ?? baseSettings.width,
    height: normalizedUpdates.height ?? baseSettings.height,
    fps: resolveFps(normalizedUpdates.fps, baseSettings.fps),
    durationMs: normalizedUpdates.durationMs ?? baseSettings.durationMs,
    backgroundColor: normalizedUpdates.backgroundColor?.trim() || baseSettings.backgroundColor,
    backgroundMode: normalizedUpdates.backgroundMode ?? baseSettings.backgroundMode,
    backgroundOpacity: mergeValue(
      normalizedUpdates.backgroundOpacity,
      baseSettings.backgroundOpacity,
      1,
    ),
    backgroundBlurAmount: mergeValue(
      normalizedUpdates.backgroundBlurAmount,
      baseSettings.backgroundBlurAmount,
      18,
    ),
    backgroundBlurZoom: mergeValue(
      normalizedUpdates.backgroundBlurZoom,
      baseSettings.backgroundBlurZoom,
      1.08,
    ),
    backgroundDim: mergeValue(normalizedUpdates.backgroundDim, baseSettings.backgroundDim, 0.08),
    backgroundSaturation: mergeValue(
      normalizedUpdates.backgroundSaturation,
      baseSettings.backgroundSaturation,
      1.05,
    ),
    backgroundGradientFrom: mergeString(
      normalizedUpdates.backgroundGradientFrom,
      baseSettings.backgroundGradientFrom,
      '#111827',
    ),
    backgroundGradientTo: mergeString(
      normalizedUpdates.backgroundGradientTo,
      baseSettings.backgroundGradientTo,
      '#ff4b1f',
    ),
    backgroundGradientAngle: mergeValue(
      normalizedUpdates.backgroundGradientAngle,
      baseSettings.backgroundGradientAngle,
      135,
    ),
    backgroundImageAssetId:
      normalizedUpdates.backgroundImageAssetId === undefined
        ? (baseSettings.backgroundImageAssetId ?? null)
        : normalizedUpdates.backgroundImageAssetId,
    backgroundImageFit: mergeValue(
      normalizedUpdates.backgroundImageFit,
      baseSettings.backgroundImageFit,
      'cover',
    ),
    backgroundImageBlurAmount: mergeValue(
      normalizedUpdates.backgroundImageBlurAmount,
      baseSettings.backgroundImageBlurAmount,
      0,
    ),
    backgroundImageDim: mergeValue(
      normalizedUpdates.backgroundImageDim,
      baseSettings.backgroundImageDim,
      0,
    ),
    backgroundImagePositionX: mergeValue(
      normalizedUpdates.backgroundImagePositionX,
      baseSettings.backgroundImagePositionX,
      50,
    ),
    backgroundImagePositionY: mergeValue(
      normalizedUpdates.backgroundImagePositionY,
      baseSettings.backgroundImagePositionY,
      50,
    ),
    backgroundImageScale: mergeValue(
      normalizedUpdates.backgroundImageScale,
      baseSettings.backgroundImageScale,
      1,
    ),
  };
}

export function resolveModernProjectSettings(
  settings: Partial<ModernProjectSettings> = {},
): ModernProjectSettings {
  return mergeModernProjectSettings(getDefaultSettings(), settings);
}

/** Creates a readable editor title from the first imported media filename. */
export function createProjectTitleFromAssetName(assetName: string): string {
  const title = assetName
    .replace(FILE_EXTENSION_PATTERN, '')
    .replace(READABLE_FILENAME_SEPARATOR_PATTERN, ' ')
    .replace(COLLAPSED_WHITESPACE_PATTERN, ' ')
    .trim();

  return title || DEFAULT_PROJECT_TITLE;
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
    selectedLayerIds: [...state.selectedLayerIds],
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

function roundLayerTransformNumber(value: number): number {
  return Math.round(value * LAYER_TRANSFORM_DECIMAL_FACTOR) / LAYER_TRANSFORM_DECIMAL_FACTOR;
}

function normalizeValue(
  value: number | undefined,
  min: number,
  max: number,
  round = false,
): number | undefined {
  if (value === undefined) return undefined;
  const clamped = clamp(value, min, max);
  return round ? Math.round(clamped) : clamped;
}

export function normalizeSettings(
  settings: Partial<ModernProjectSettings>,
): Partial<ModernProjectSettings> {
  return {
    ...settings,
    width: normalizeValue(settings.width, MIN_CANVAS_SIZE, MAX_CANVAS_SIZE, true),
    height: normalizeValue(settings.height, MIN_CANVAS_SIZE, MAX_CANVAS_SIZE, true),
    durationMs: normalizeValue(settings.durationMs, 0, MODERN_LIMITS.MAX_DURATION_MS),
    backgroundOpacity: normalizeValue(settings.backgroundOpacity, 0, 1),
    backgroundBlurAmount: normalizeValue(settings.backgroundBlurAmount, 0, 50),
    backgroundBlurZoom: normalizeValue(settings.backgroundBlurZoom, 1, 1.5),
    backgroundDim: normalizeValue(settings.backgroundDim, 0, 0.6),
    backgroundSaturation: normalizeValue(settings.backgroundSaturation, 0, 2),
    backgroundGradientAngle: normalizeValue(settings.backgroundGradientAngle, 0, 360),
    backgroundImageBlurAmount: normalizeValue(settings.backgroundImageBlurAmount, 0, 40),
    backgroundImageDim: normalizeValue(settings.backgroundImageDim, 0, 0.6),
    backgroundImagePositionX: normalizeValue(settings.backgroundImagePositionX, 0, 100),
    backgroundImagePositionY: normalizeValue(settings.backgroundImagePositionY, 0, 100),
    backgroundImageScale: normalizeValue(settings.backgroundImageScale, 1, 2),
  };
}

export function normalizeLayerUpdates(layer: Layer, updates: Partial<Layer>): Partial<Layer> {
  const normalized: Partial<Layer> = { ...updates };

  if (updates.x !== undefined) {
    normalized.x = roundLayerTransformNumber(clamp(updates.x, -100, 200));
  }
  if (updates.y !== undefined) {
    normalized.y = roundLayerTransformNumber(clamp(updates.y, -100, 200));
  }
  if (updates.width !== undefined) {
    normalized.width = roundLayerTransformNumber(clamp(updates.width, 1, 200));
  }
  if (updates.height !== undefined) {
    normalized.height = roundLayerTransformNumber(clamp(updates.height, 1, 200));
  }
  if (updates.rotation !== undefined) {
    normalized.rotation = roundLayerTransformNumber(clamp(updates.rotation, -360, 360));
  }
  if (updates.opacity !== undefined) {
    normalized.opacity = roundLayerTransformNumber(clamp(updates.opacity, 0, 1));
  }

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
