/**
 * Modern Editor Compiler
 *
 * Deterministically compiles ModernProject to EditorTimeline.
 * This is the single source of truth for export parity.
 *
 * Compiler Contract:
 * - Input: ModernProject (layers, settings)
 * - Output: EditorTimeline (tracks, clips) + CompilerMetadata
 * - Deterministic: Same input always produces same output
 * - Validates: Assets exist, timing bounds, layer limits
 */

import type {
  ModernProject,
  Layer,
  VideoLayer,
  ImageLayer,
  TextLayer,
  AudioLayer,
  CompilerMetadata,
  CompilerError,
  CompilerErrorCode,
} from "@vibe-creator/shared";
import { MODERN_COMPILER_VERSION, MODERN_LIMITS } from "@vibe-creator/shared";
import type {
  EditorTimeline,
  EditorTrack,
  EditorClip,
  EditorAsset,
} from "@/stores/editor-store";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface CompileResult {
  success: true;
  timeline: EditorTimeline;
  metadata: CompilerMetadata;
}

export interface CompileFailure {
  success: false;
  errors: CompilerError[];
}

export type CompilerOutput = CompileResult | CompileFailure;

interface AssetRegistry {
  assets: Map<string, EditorAsset>;
  getAsset: (id: string) => EditorAsset | undefined;
}

// -----------------------------------------------------------------------------
// Deterministic ID Generation
// -----------------------------------------------------------------------------

/**
 * Generate stable, deterministic clip ID
 * Formula: hash(layerId + trackType + segmentIndex)
 * This ensures same input always produces same IDs
 */
function generateClipId(
  layerId: string,
  trackType: string,
  segmentIndex: number
): string {
  const input = `${layerId}:${trackType}:${segmentIndex}`;
  // Simple hash for determinism (not cryptographic)
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return `clip-${Math.abs(hash).toString(36)}-${layerId.slice(-4)}`;
}

/**
 * Generate stable track ID based on type and order
 */
function generateTrackId(trackType: string, order: number): string {
  return `track-${trackType.toLowerCase()}-${order}`;
}

// -----------------------------------------------------------------------------
// Validation
// -----------------------------------------------------------------------------

function createError(
  code: CompilerErrorCode,
  message: string,
  layerId?: string,
  details?: Record<string, unknown>
): CompilerError {
  return { code, message, layerId, details };
}

function validateProject(
  project: ModernProject,
  assets: AssetRegistry
): CompilerError[] {
  const errors: CompilerError[] = [];

  // Validate layer count
  if (project.layers.length > MODERN_LIMITS.MAX_LAYERS) {
    errors.push(
      createError(
        "EXCEEDS_LAYER_LIMIT",
        `Project has ${project.layers.length} layers, max is ${MODERN_LIMITS.MAX_LAYERS}`
      )
    );
  }

  // Validate each layer
  for (const layer of project.layers) {
    // Check asset exists (if required)
    if (layer.assetId !== null) {
      const asset = assets.getAsset(layer.assetId);
      if (!asset) {
        errors.push(
          createError(
            "ASSET_MISSING",
            `Asset '${layer.assetId}' not found`,
            layer.id,
            { assetId: layer.assetId }
          )
        );
      }
    }

    // Validate timing bounds
    if (layer.startMs < 0) {
      errors.push(
        createError(
          "OUT_OF_BOUNDS_TIMING",
          `Layer startMs (${layer.startMs}) cannot be negative`,
          layer.id
        )
      );
    }

    if (layer.endMs <= layer.startMs) {
      errors.push(
        createError(
          "VALIDATION_FAILED",
          `Layer endMs (${layer.endMs}) must be greater than startMs (${layer.startMs})`,
          layer.id
        )
      );
    }

    if (layer.endMs > MODERN_LIMITS.MAX_DURATION_MS) {
      errors.push(
        createError(
          "EXCEEDS_DURATION_LIMIT",
          `Layer endMs (${layer.endMs}) exceeds max duration (${MODERN_LIMITS.MAX_DURATION_MS})`,
          layer.id
        )
      );
    }

    // Validate layer type-specific
    validateLayerData(layer, errors);
  }

  return errors;
}

function validateLayerData(layer: Layer, errors: CompilerError[]): void {
  switch (layer.type) {
    case "video":
    case "image":
    case "audio":
      if (layer.assetId === null) {
        errors.push(
          createError(
            "VALIDATION_FAILED",
            `${layer.type} layer must have an assetId`,
            layer.id
          )
        );
      }
      break;
    case "text":
      // Text layers don't need assetId, but need text content
      if (!layer.data.text || layer.data.text.trim() === "") {
        errors.push(
          createError(
            "VALIDATION_FAILED",
            "Text layer must have text content",
            layer.id
          )
        );
      }
      break;
    default: {
      // Type guard for exhaustive check
      const _exhaustive: never = layer;
      errors.push(
        createError(
          "UNSUPPORTED_LAYER_TYPE",
          `Unsupported layer type: ${(_exhaustive as Layer).type}`,
          (layer as Layer).id
        )
      );
    }
  }
}

// -----------------------------------------------------------------------------
// Compilation
// -----------------------------------------------------------------------------

/**
 * Convert layer transforms to clip transforms
 * Maps percentage-based layer coords to pixel-based clip coords
 */
function layerToClipTransforms(
  layer: Layer,
  projectWidth: number,
  projectHeight: number
) {
  // Convert from percentage (0-100) to normalized pixel offset
  // For center anchor, x/y represent center position
  // Clip transforms use offset from center (0,0 = centered)
  const centerX =
    layer.anchor === "center" ? 0 : ((layer.x - 50) / 100) * projectWidth;
  const centerY =
    layer.anchor === "center" ? 0 : ((layer.y - 50) / 100) * projectHeight;

  return {
    x: centerX + ((layer.x - 50) / 100) * projectWidth,
    y: centerY + ((layer.y - 50) / 100) * projectHeight,
    scale: layer.width / 100, // width as scale factor
    rotation: layer.rotation,
    opacity: layer.opacity,
  };
}

/**
 * Convert a video layer to timeline clips
 */
function compileVideoLayer(
  layer: VideoLayer,
  asset: EditorAsset,
  projectSettings: ModernProject["settings"]
): { videoClip: EditorClip; audioClip?: EditorClip } {
  const linkId = `link-${layer.id}`;

  const videoClip: EditorClip = {
    id: generateClipId(layer.id, "VIDEO", 0),
    assetId: layer.assetId,
    linkId,
    startMs: layer.startMs,
    endMs: layer.endMs,
    trimStartMs: layer.data.trimStartMs,
    trimEndMs: layer.data.trimEndMs,
    transforms: layerToClipTransforms(
      layer,
      projectSettings.width,
      projectSettings.height
    ),
    effects: {
      filters: [],
      speed: 1,
      volume: layer.data.volume,
      fadeIn: 0,
      fadeOut: 0,
    },
    asset,
  };

  // Create linked audio clip for video with audio
  const audioClip: EditorClip = {
    id: generateClipId(layer.id, "AUDIO", 0),
    assetId: layer.assetId,
    linkId,
    startMs: layer.startMs,
    endMs: layer.endMs,
    trimStartMs: layer.data.trimStartMs,
    trimEndMs: layer.data.trimEndMs,
    transforms: { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1 },
    effects: {
      filters: [],
      speed: 1,
      volume: layer.data.volume,
      fadeIn: 0,
      fadeOut: 0,
    },
    asset,
  };

  return { videoClip, audioClip };
}

/**
 * Convert an image layer to a timeline clip
 */
function compileImageLayer(
  layer: ImageLayer,
  asset: EditorAsset,
  projectSettings: ModernProject["settings"]
): EditorClip {
  return {
    id: generateClipId(layer.id, "VIDEO", 0), // Images go on video track
    assetId: layer.assetId,
    startMs: layer.startMs,
    endMs: layer.endMs,
    trimStartMs: 0,
    trimEndMs: 0,
    transforms: layerToClipTransforms(
      layer,
      projectSettings.width,
      projectSettings.height
    ),
    effects: {
      filters: [],
      speed: 1,
      volume: 0,
      fadeIn: 0,
      fadeOut: 0,
    },
    asset,
  };
}

/**
 * Convert an audio layer to a timeline clip
 */
function compileAudioLayer(layer: AudioLayer, asset: EditorAsset): EditorClip {
  return {
    id: generateClipId(layer.id, "AUDIO", 0),
    assetId: layer.assetId,
    startMs: layer.startMs,
    endMs: layer.endMs,
    trimStartMs: layer.data.trimStartMs,
    trimEndMs: layer.data.trimEndMs,
    transforms: { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1 },
    effects: {
      filters: [],
      speed: 1,
      volume: layer.data.volume,
      fadeIn: layer.data.fadeIn,
      fadeOut: layer.data.fadeOut,
    },
    asset,
  };
}

// Note: Text layers are handled separately via textOverlays in the existing system

/**
 * Main compile function
 * Converts ModernProject to EditorTimeline deterministically
 */
export function compileModernProject(
  project: ModernProject,
  assetsArray: EditorAsset[]
): CompilerOutput {
  // Build asset registry
  const assetMap = new Map(assetsArray.map((a) => [a.id, a]));
  const assets: AssetRegistry = {
    assets: assetMap,
    getAsset: (id: string) => assetMap.get(id),
  };

  // Validate
  const errors = validateProject(project, assets);
  if (errors.length > 0) {
    return { success: false, errors };
  }

  // Sort layers by zIndex for overlay ordering (lower zIndex first)
  const sortedLayers = [...project.layers].sort((a, b) => a.zIndex - b.zIndex);

  // Group layers: visual (video/image) vs audio
  const visualLayers = sortedLayers.filter(
    (l) => l.type === "video" || l.type === "image"
  );
  const audioLayers = sortedLayers.filter((l) => l.type === "audio");
  // Note: Text layers handled separately via extractTextOverlays()

  // Build video tracks (one per visual layer for z-ordering)
  const videoTracks: EditorTrack[] = [];
  const audioClips: EditorClip[] = [];

  visualLayers.forEach((layer, index) => {
    const trackId = generateTrackId("VIDEO", index);
    const track: EditorTrack = {
      id: trackId,
      type: "VIDEO",
      order: index,
      muted: !layer.visible,
      volume: 1,
      locked: layer.locked,
      clips: [],
    };

    if (layer.type === "video") {
      const asset = assets.getAsset(layer.assetId!)!;
      const { videoClip, audioClip } = compileVideoLayer(
        layer,
        asset,
        project.settings
      );
      track.clips.push(videoClip);
      if (audioClip) {
        audioClips.push(audioClip);
      }
    } else if (layer.type === "image") {
      const asset = assets.getAsset(layer.assetId!)!;
      const clip = compileImageLayer(layer, asset, project.settings);
      track.clips.push(clip);
    }

    videoTracks.push(track);
  });

  // Build audio track
  const audioTrack: EditorTrack = {
    id: generateTrackId("AUDIO", 0),
    type: "AUDIO",
    order: videoTracks.length,
    muted: false,
    volume: 1,
    locked: false,
    clips: [...audioClips],
  };

  // Add standalone audio layer clips
  audioLayers.forEach((layer) => {
    if (layer.type === "audio") {
      const asset = assets.getAsset(layer.assetId!)!;
      const clip = compileAudioLayer(layer, asset);
      audioTrack.clips.push(clip);
    }
  });

  // Calculate duration
  const allTracks = [...videoTracks, audioTrack];
  let maxEndMs = 0;
  for (const track of allTracks) {
    for (const clip of track.clips) {
      if (clip.endMs > maxEndMs) {
        maxEndMs = clip.endMs;
      }
    }
  }

  const timeline: EditorTimeline = {
    durationMs: maxEndMs,
    tracks: allTracks,
  };

  const metadata: CompilerMetadata = {
    modernSchemaVersion: project.schemaVersion,
    compilerVersion: MODERN_COMPILER_VERSION,
    compiledAt: new Date().toISOString(),
    sourceProjectId: project.id,
  };

  // Note: Text layers are returned separately for the textOverlays system
  // They are not part of EditorTimeline but handled by the existing TextOverlay array

  return {
    success: true,
    timeline,
    metadata,
  };
}

/**
 * Extract text overlays from ModernProject for the existing TextOverlay system
 */
export function extractTextOverlays(project: ModernProject) {
  return project.layers
    .filter((l): l is TextLayer => l.type === "text")
    .map((layer) => ({
      id: layer.id,
      text: layer.data.text,
      fontFamily: layer.data.fontFamily,
      fontSize: layer.data.fontSize,
      fontWeight: layer.data.fontWeight,
      fontStyle: layer.data.fontStyle,
      color: layer.data.color,
      backgroundColor: layer.data.backgroundColor,
      x: layer.x,
      y: layer.y,
      rotation: layer.rotation,
      textAlign: layer.data.textAlign,
      startMs: layer.startMs,
      endMs: layer.endMs,
      animation: layer.data.animation,
    }));
}

/**
 * Check if compiler output is successful
 */
export function isCompileSuccess(
  output: CompilerOutput
): output is CompileResult {
  return output.success === true;
}
