import { z } from 'zod';

/**
 * Schema version for editor project state
 * Increment when breaking changes to schema occur
 */
export const EDITOR_SCHEMA_VERSION = 1;

/**
 * Editor performance limits (enforced server-side)
 */
export const EDITOR_LIMITS = {
  MAX_DURATION_MS: 30 * 60 * 1000, // 30 minutes
  MAX_CLIPS_PER_TRACK: 100,
  MAX_TEXT_OVERLAYS: 50,
  MAX_ASSETS: 200,
  MIN_CLIP_DURATION_MS: 100, // 100ms
  MAX_CLIP_DURATION_MS: 10 * 60 * 1000, // 10 minutes per clip
} as const;

/**
 * Export capability matrix
 * Defines valid combinations of format, codec, and resolution
 */
export const EXPORT_CAPABILITIES = {
  MP4: {
    codecs: ['h264', 'h265'] as const,
    defaultCodec: 'h264',
    resolutions: ['720p', '1080p', '4K'] as const,
    container: 'mp4',
    mimeType: 'video/mp4',
  },
  WEBM: {
    codecs: ['vp9'] as const,
    defaultCodec: 'vp9',
    resolutions: ['720p', '1080p', '4K'] as const,
    container: 'webm',
    mimeType: 'video/webm',
  },
  MOV: {
    codecs: ['prores'] as const,
    defaultCodec: 'prores',
    resolutions: ['1080p', '4K'] as const, // ProRes typically for high quality
    container: 'mov',
    mimeType: 'video/quicktime',
  },
} as const;

/**
 * Resolution to pixel dimensions mapping
 */
export const RESOLUTION_MAP = {
  '720p': { width: 1280, height: 720 },
  '1080p': { width: 1920, height: 1080 },
  '4K': { width: 3840, height: 2160 },
} as const;

/**
 * Quality presets with explicit bitrates
 */
export const QUALITY_PRESETS = {
  low: { videoBitrate: '2M', audioBitrate: '128k', crf: 28 },
  medium: { videoBitrate: '5M', audioBitrate: '192k', crf: 23 },
  high: { videoBitrate: '10M', audioBitrate: '256k', crf: 18 },
  lossless: { videoBitrate: '20M', audioBitrate: '320k', crf: 0 },
} as const;

/**
 * Export presets for common platforms
 */
export const EXPORT_PRESETS = {
  youtube: { format: 'MP4', resolution: '1080p', quality: 'high', aspectRatio: '16:9' },
  tiktok: { format: 'MP4', resolution: '1080p', quality: 'medium', aspectRatio: '9:16' },
  instagram_feed: { format: 'MP4', resolution: '1080p', quality: 'medium', aspectRatio: '1:1' },
  instagram_story: { format: 'MP4', resolution: '1080p', quality: 'medium', aspectRatio: '9:16' },
  twitter: { format: 'MP4', resolution: '720p', quality: 'medium', aspectRatio: '16:9' },
} as const;

// ============================================
// Zod Schemas
// ============================================

/**
 * Clip effects schema
 */
export const clipEffectsSchema = z.object({
  volume: z.number().min(0).max(2).default(1), // 0-200%
  speed: z.number().min(0.25).max(4).default(1), // 0.25x - 4x
  fadeInMs: z.number().min(0).default(0),
  fadeOutMs: z.number().min(0).default(0),
  filters: z.array(z.string()).max(10).default([]),
});

/**
 * Clip transforms schema
 */
export const clipTransformsSchema = z.object({
  x: z.number().default(0),
  y: z.number().default(0),
  scale: z.number().min(0.1).max(10).default(1),
  rotation: z.number().min(-360).max(360).default(0),
  opacity: z.number().min(0).max(1).default(1),
});

/**
 * Timeline clip schema
 */
export const timelineClipSchema = z.object({
  id: z.string().uuid(),
  assetId: z.string().uuid().nullable(),
  startMs: z.number().min(0),
  endMs: z.number().min(0),
  trimStartMs: z.number().min(0).default(0),
  trimEndMs: z.number().min(0).default(0),
  effects: clipEffectsSchema.optional(),
  transforms: clipTransformsSchema.optional(),
}).refine(
  data => data.endMs > data.startMs,
  { message: 'endMs must be greater than startMs' }
).refine(
  data => (data.endMs - data.startMs) >= EDITOR_LIMITS.MIN_CLIP_DURATION_MS,
  { message: `Clip duration must be at least ${EDITOR_LIMITS.MIN_CLIP_DURATION_MS}ms` }
).refine(
  data => (data.endMs - data.startMs) <= EDITOR_LIMITS.MAX_CLIP_DURATION_MS,
  { message: `Clip duration must not exceed ${EDITOR_LIMITS.MAX_CLIP_DURATION_MS}ms` }
);

/**
 * Timeline track schema
 */
export const timelineTrackSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(['VIDEO', 'AUDIO']),
  order: z.number().min(0),
  muted: z.boolean().default(false),
  volume: z.number().min(0).max(2).default(1),
  locked: z.boolean().default(false),
  clips: z.array(timelineClipSchema).max(EDITOR_LIMITS.MAX_CLIPS_PER_TRACK),
});

/**
 * Text overlay animation schema
 */
export const textAnimationSchema = z.object({
  type: z.enum(['none', 'fade', 'slide', 'typewriter']).default('none'),
  durationMs: z.number().min(0).max(5000).default(500),
  easing: z.enum(['linear', 'ease-in', 'ease-out', 'ease-in-out']).default('ease-out'),
});

/**
 * Text overlay style schema
 */
export const textStyleSchema = z.object({
  fontFamily: z.string().default('Inter'),
  fontSize: z.number().min(8).max(200).default(48),
  fontWeight: z.enum(['normal', 'bold']).default('normal'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6,8}$/).default('#ffffff'),
  stroke: z.object({
    width: z.number().min(0).max(10).default(0),
    color: z.string().regex(/^#[0-9A-Fa-f]{6,8}$/).default('#000000'),
  }).optional(),
  shadow: z.object({
    x: z.number().default(2),
    y: z.number().default(2),
    blur: z.number().min(0).max(50).default(4),
    color: z.string().regex(/^#[0-9A-Fa-f]{6,8}$/).default('#00000080'),
  }).optional(),
});

/**
 * Text overlay schema
 */
export const textOverlaySchema = z.object({
  id: z.string().uuid(),
  text: z.string().min(1).max(500),
  x: z.number().min(0).max(1), // Normalized 0-1
  y: z.number().min(0).max(1),
  width: z.number().min(0.1).max(1).optional(),
  rotation: z.number().min(-360).max(360).default(0),
  startMs: z.number().min(0),
  endMs: z.number().min(0),
  style: textStyleSchema.optional(),
  animation: textAnimationSchema.optional(),
}).refine(
  data => data.endMs > data.startMs,
  { message: 'Text overlay endMs must be greater than startMs' }
);

/**
 * Timeline settings schema
 */
export const timelineSettingsSchema = z.object({
  width: z.number().min(480).max(3840).default(1920),
  height: z.number().min(360).max(2160).default(1080),
  fps: z.number().min(15).max(60).default(30),
  backgroundColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#000000'),
});

/**
 * Complete timeline schema
 */
export const timelineSchema = z.object({
  durationMs: z.number().min(0).max(EDITOR_LIMITS.MAX_DURATION_MS),
  tracks: z.array(timelineTrackSchema).min(1).max(10),
});

/**
 * Export settings schema with capability matrix validation
 */
export const exportSettingsSchema = z.object({
  format: z.enum(['MP4', 'WEBM', 'MOV']).default('MP4'),
  resolution: z.enum(['720p', '1080p', '4K']).default('1080p'),
  quality: z.enum(['low', 'medium', 'high', 'lossless']).default('high'),
  addWatermark: z.boolean().default(true),
  preset: z.enum(['youtube', 'tiktok', 'instagram_feed', 'instagram_story', 'twitter']).optional(),
}).refine(
  data => {
    // Validate resolution is supported for format
    const capabilities = EXPORT_CAPABILITIES[data.format];
    return capabilities.resolutions.includes(data.resolution as never);
  },
  { message: 'Resolution not supported for selected format' }
);

/**
 * Complete EditorProjectDTO schema
 * Used for server-side validation before export
 */
export const editorProjectDTOSchema = z.object({
  schemaVersion: z.literal(EDITOR_SCHEMA_VERSION),
  projectId: z.string().uuid(),
  timeline: timelineSchema,
  textOverlays: z.array(textOverlaySchema).max(EDITOR_LIMITS.MAX_TEXT_OVERLAYS),
  exportSettings: exportSettingsSchema,
  assets: z.array(z.object({
    id: z.string().uuid(),
    type: z.enum(['VIDEO', 'AUDIO', 'IMAGE']),
    storageKey: z.string(), // R2/S3 key
    durationMs: z.number().optional(),
    width: z.number().optional(),
    height: z.number().optional(),
  })).max(EDITOR_LIMITS.MAX_ASSETS),
});

// Type exports
export type ClipEffects = z.infer<typeof clipEffectsSchema>;
export type ClipTransforms = z.infer<typeof clipTransformsSchema>;
export type TimelineClip = z.infer<typeof timelineClipSchema>;
export type TimelineTrack = z.infer<typeof timelineTrackSchema>;
export type TextOverlay = z.infer<typeof textOverlaySchema>;
export type Timeline = z.infer<typeof timelineSchema>;
export type ExportSettings = z.infer<typeof exportSettingsSchema>;
export type EditorProjectDTO = z.infer<typeof editorProjectDTOSchema>;
