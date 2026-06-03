/**
 * Modern Video Editor Types
 *
 * Layer-based model for canvas editing.
 * Compiles deterministically to EditorTimeline for export.
 */

// Schema version for migrations
export const MODERN_SCHEMA_VERSION = 1;

// Compiler version for parity tracking
export const MODERN_COMPILER_VERSION = '1.0.0';

// -----------------------------------------------------------------------------
// Constraints & Limits
// -----------------------------------------------------------------------------

export const MODERN_LIMITS = {
  MAX_LAYERS: 30,
  MAX_DURATION_MS: 10 * 60 * 1000, // 10 minutes
  ALLOWED_FPS: [24, 30, 60] as const,
  ALLOWED_RESOLUTIONS: {
    '720p': { width: 1280, height: 720 },
    '1080p': { width: 1920, height: 1080 },
    '1080p_portrait': { width: 1080, height: 1920 },
    '1080p_square': { width: 1080, height: 1080 },
  } as const,
  DEFAULT_FPS: 30,
  DEFAULT_RESOLUTION: '1080p' as const,
} as const;

export type AllowedFps = (typeof MODERN_LIMITS.ALLOWED_FPS)[number];
export type AllowedResolution = keyof typeof MODERN_LIMITS.ALLOWED_RESOLUTIONS;

// -----------------------------------------------------------------------------
// Layer Types
// -----------------------------------------------------------------------------

export type LayerType = 'video' | 'image' | 'text' | 'audio';

export type AnchorPoint = 'center' | 'topLeft';

export type FitMode = 'cover' | 'contain';

export type CanvasBackgroundMode = 'solid' | 'blur' | 'gradient' | 'image';

export type VisualFilterId = 'none' | 'grayscale' | 'warm' | 'cold' | 'vivid';

export type VisualTransitionId = 'none' | 'fade' | 'slide-left' | 'slide-right' | 'zoom';

export type VisualMotionId = 'none' | 'zoom-in' | 'zoom-out';

export type TextAnimationInId =
  | 'none'
  | 'fade'
  | 'slide-up'
  | 'slide-down'
  | 'pop'
  | 'zoom'
  | 'typewriter';

export type TextAnimationOutId = 'none' | 'fade-out' | 'slide-out' | 'shrink';

export type TextAnimationLoopId = 'none' | 'pulse' | 'shake' | 'glow';

export interface VisualLayerEffects {
  filter: VisualFilterId;
  fadeInMs: number;
  fadeOutMs: number;
  transitionIn: VisualTransitionId;
  transitionOut: VisualTransitionId;
  motion: VisualMotionId;
}

/**
 * Base layer properties shared by all layer types
 */
export interface BaseLayer {
  id: string;
  type: LayerType;
  /** Reference to ingested asset (NOT url) - null for text layers */
  assetId: string | null;
  zIndex: number;
  visible: boolean;
  locked: boolean;
  // Transforms
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  width: number; // percentage 0-100
  height: number; // percentage 0-100
  rotation: number; // degrees
  opacity: number; // 0-1
  anchor: AnchorPoint;
  // Timing (MVP)
  startMs: number;
  endMs: number;
}

/**
 * Video layer data
 */
export interface VideoLayerData {
  fit: FitMode;
  volume: number; // 0-2
  loop: boolean;
  trimStartMs: number;
  trimEndMs: number;
  effects: VisualLayerEffects;
}

export interface VideoLayer extends BaseLayer {
  type: 'video';
  data: VideoLayerData;
}

/**
 * Image layer data
 */
export interface ImageLayerData {
  fit: FitMode;
  effects: VisualLayerEffects;
}

export interface ImageLayer extends BaseLayer {
  type: 'image';
  data: ImageLayerData;
}

/**
 * Text layer data (no assetId needed)
 */
export interface TextLayerData {
  text: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  color: string;
  backgroundColor?: string;
  backgroundOpacity?: number;
  textAlign: 'left' | 'center' | 'right';
  /** Legacy single animation value. Keep for older drafts/projects. */
  animation: Extract<TextAnimationInId, 'none' | 'fade' | 'slide-up' | 'slide-down' | 'typewriter'>;
  animationIn?: TextAnimationInId;
  animationOut?: TextAnimationOutId;
  animationLoop?: TextAnimationLoopId;
}

export interface TextLayer extends BaseLayer {
  type: 'text';
  assetId: null; // Text layers never have assets
  data: TextLayerData;
}

/**
 * Audio layer data
 */
export interface AudioLayerData {
  volume: number; // 0-2
  loop: boolean;
  fadeIn: number; // ms
  fadeOut: number; // ms
  trimStartMs: number;
  trimEndMs: number;
}

export interface AudioLayer extends BaseLayer {
  type: 'audio';
  data: AudioLayerData;
}

export type Layer = VideoLayer | ImageLayer | TextLayer | AudioLayer;

// -----------------------------------------------------------------------------
// Project
// -----------------------------------------------------------------------------

export interface ModernProjectSettings {
  width: number;
  height: number;
  fps: AllowedFps;
  /** Derived from max(layer.endMs) or explicit */
  durationMs: number;
  backgroundColor: string;
  backgroundMode: CanvasBackgroundMode;
  backgroundOpacity?: number;
  backgroundBlurAmount?: number;
  backgroundBlurZoom?: number;
  backgroundDim?: number;
  backgroundSaturation?: number;
  backgroundGradientFrom?: string;
  backgroundGradientTo?: string;
  backgroundGradientAngle?: number;
  backgroundImageAssetId?: string | null;
  backgroundImageFit?: FitMode;
  backgroundImageBlurAmount?: number;
  backgroundImageDim?: number;
  backgroundImagePositionX?: number;
  backgroundImagePositionY?: number;
  backgroundImageScale?: number;
}

/**
 * Modern Video Editor project
 */
export interface ModernProject {
  schemaVersion: number;
  id: string;
  title: string;
  settings: ModernProjectSettings;
  /** Ordered by zIndex for rendering */
  layers: Layer[];
}

// -----------------------------------------------------------------------------
// Compiler Output Metadata
// -----------------------------------------------------------------------------

export interface CompilerMetadata {
  modernSchemaVersion: number;
  compilerVersion: string;
  compiledAt: string; // ISO timestamp
  sourceProjectId: string;
}

// -----------------------------------------------------------------------------
// Compiler Errors (Structured)
// -----------------------------------------------------------------------------

export type CompilerErrorCode =
  | 'ASSET_MISSING'
  | 'VALIDATION_FAILED'
  | 'UNSUPPORTED_LAYER_TYPE'
  | 'OUT_OF_BOUNDS_TIMING'
  | 'EXCEEDS_DURATION_LIMIT'
  | 'EXCEEDS_LAYER_LIMIT';

export interface CompilerError {
  code: CompilerErrorCode;
  message: string;
  layerId?: string;
  details?: Record<string, unknown>;
}

// -----------------------------------------------------------------------------
// Defaults & Factories
// -----------------------------------------------------------------------------

export function createDefaultModernProject(id: string, title: string): ModernProject {
  const resolution = MODERN_LIMITS.ALLOWED_RESOLUTIONS[MODERN_LIMITS.DEFAULT_RESOLUTION];
  return {
    schemaVersion: MODERN_SCHEMA_VERSION,
    id,
    title,
    settings: {
      width: resolution.width,
      height: resolution.height,
      fps: MODERN_LIMITS.DEFAULT_FPS,
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
    },
    layers: [],
  };
}

export function createDefaultVisualLayerEffects(): VisualLayerEffects {
  return {
    filter: 'none',
    fadeInMs: 0,
    fadeOutMs: 0,
    transitionIn: 'none',
    transitionOut: 'none',
    motion: 'none',
  };
}

export function createVideoLayer(
  id: string,
  assetId: string,
  zIndex: number,
  startMs: number,
  endMs: number,
): VideoLayer {
  return {
    id,
    type: 'video',
    assetId,
    zIndex,
    visible: true,
    locked: false,
    x: 50,
    y: 50,
    width: 100,
    height: 100,
    rotation: 0,
    opacity: 1,
    anchor: 'center',
    startMs,
    endMs,
    data: {
      fit: 'contain',
      volume: 1,
      loop: false,
      trimStartMs: 0,
      trimEndMs: 0,
      effects: createDefaultVisualLayerEffects(),
    },
  };
}

export function createImageLayer(
  id: string,
  assetId: string,
  zIndex: number,
  startMs: number,
  endMs: number,
): ImageLayer {
  return {
    id,
    type: 'image',
    assetId,
    zIndex,
    visible: true,
    locked: false,
    x: 50,
    y: 50,
    width: 50,
    height: 50,
    rotation: 0,
    opacity: 1,
    anchor: 'center',
    startMs,
    endMs,
    data: {
      fit: 'contain',
      effects: createDefaultVisualLayerEffects(),
    },
  };
}

export function createTextLayer(
  id: string,
  text: string,
  zIndex: number,
  startMs: number,
  endMs: number,
): TextLayer {
  return {
    id,
    type: 'text',
    assetId: null,
    zIndex,
    visible: true,
    locked: false,
    x: 50,
    y: 50,
    width: 80,
    height: 20,
    rotation: 0,
    opacity: 1,
    anchor: 'center',
    startMs,
    endMs,
    data: {
      text,
      fontFamily: 'Inter',
      fontSize: 48,
      fontWeight: 'bold',
      fontStyle: 'normal',
      color: '#ffffff',
      textAlign: 'center',
      animation: 'none',
      animationIn: 'none',
      animationOut: 'none',
      animationLoop: 'none',
    },
  };
}

export function createAudioLayer(
  id: string,
  assetId: string,
  zIndex: number,
  startMs: number,
  endMs: number,
): AudioLayer {
  return {
    id,
    type: 'audio',
    assetId,
    zIndex,
    visible: true,
    locked: false,
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    rotation: 0,
    opacity: 1,
    anchor: 'center',
    startMs,
    endMs,
    data: {
      volume: 1,
      loop: false,
      fadeIn: 0,
      fadeOut: 0,
      trimStartMs: 0,
      trimEndMs: 0,
    },
  };
}
