import { z } from 'zod';

export const studioAssetKindSchema = z.enum(['text', 'audio', 'element']);
export const studioTextPreviewVariantSchema = z.enum([
  'hook',
  'title',
  'caption',
  'closing',
  'lower-third',
  'quote',
  'cta',
  'highlight',
  'marker',
  'strip',
]);

export const studioTextLayerDataSchema = z.object({
  fontSize: z.number().min(8).max(200),
  fontWeight: z.enum(['normal', 'bold']),
  fontStyle: z.enum(['normal', 'italic']).default('normal'),
  color: z.string().min(1),
  backgroundColor: z.string().optional(),
  textAlign: z.enum(['left', 'center', 'right']),
  animation: z.enum(['none', 'fade', 'slide-up', 'slide-down', 'typewriter']),
});

export const studioTextPreviewSchema = z.object({
  variant: studioTextPreviewVariantSchema,
  badge: z.string().min(1),
  title: z.string().min(1),
  subtitle: z.string().min(1),
});

export const studioBaseVisualPayloadSchema = z.object({
  durationMs: z.number().int().min(100).max(60_000),
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
  width: z.number().min(1).max(100),
  height: z.number().min(1).max(100),
  data: studioTextLayerDataSchema,
  preview: studioTextPreviewSchema,
});

export const studioTextPayloadSchema = studioBaseVisualPayloadSchema.extend({
  kind: z.literal('text-layer'),
  text: z.string().min(1).max(500),
});

export const studioElementPayloadSchema = studioBaseVisualPayloadSchema.extend({
  kind: z.literal('element-layer'),
  text: z.string().max(500),
});

export const studioVisualPayloadSchema = z.discriminatedUnion('kind', [
  studioTextPayloadSchema,
  studioElementPayloadSchema,
]);

export const studioSfxPayloadSchema = z.object({
  kind: z.literal('audio-sfx'),
  fileName: z.string().min(1),
  waveform: z.enum(['sine', 'square', 'triangle', 'noise', 'sweep', 'pop', 'thump', 'whoosh']),
  durationMs: z.number().int().min(100).max(10_000),
  frequencyHz: z.number().min(20).max(20_000),
  endFrequencyHz: z.number().min(20).max(20_000).optional(),
  volume: z.number().min(0).max(1),
  attackMs: z.number().int().min(0).max(1000),
  releaseMs: z.number().int().min(0).max(3000),
});

export const studioAudioFilePayloadSchema = z.object({
  kind: z.literal('audio-file'),
  fileName: z.string().min(1),
  mimeType: z.enum(['audio/mpeg', 'audio/ogg', 'audio/wav']),
  durationMs: z.number().int().min(10).max(600_000),
});

export const studioAudioPayloadSchema = z.discriminatedUnion('kind', [
  studioSfxPayloadSchema,
  studioAudioFilePayloadSchema,
]);

export const studioAssetLicenseSchema = z.object({
  name: z.string().min(1),
  sourceUrl: z.string().url().nullable(),
  attributionRequired: z.boolean(),
  commercialUse: z.boolean(),
});

export const studioAssetSchema = z.object({
  id: z.string().min(1),
  kind: studioAssetKindSchema,
  title: z.string().min(1),
  description: z.string().min(1),
  category: z.string().min(1),
  tags: z.array(z.string()),
  thumbnailUrl: z.string().nullable(),
  previewUrl: z.string().nullable(),
  payload: z.union([studioVisualPayloadSchema, studioAudioPayloadSchema]),
  durationMs: z.number().int().nullable(),
  license: studioAssetLicenseSchema,
  source: z.string().min(1),
  sortOrder: z.number().int().min(0),
});

export const listStudioAssetsQuerySchema = z.object({
  kind: studioAssetKindSchema.optional(),
  category: z.string().min(1).optional(),
  q: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(50),
  cursor: z.string().min(1).optional(),
});

export const studioAssetParamsSchema = z.object({
  id: z.string().min(1),
});

export const studioAssetListResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    items: z.array(studioAssetSchema),
    nextCursor: z.string().nullable(),
    hasMore: z.boolean(),
  }),
});

export const studioAssetResponseSchema = z.object({
  success: z.literal(true),
  data: studioAssetSchema,
});

export const studioAssetErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
});

export type StudioAsset = z.infer<typeof studioAssetSchema>;
export type StudioAssetKind = z.infer<typeof studioAssetKindSchema>;
export type StudioTextLayerData = z.infer<typeof studioTextLayerDataSchema>;
export type StudioTextPreview = z.infer<typeof studioTextPreviewSchema>;
export type StudioAudioFilePayload = z.infer<typeof studioAudioFilePayloadSchema>;
export type StudioSfxPayload = z.infer<typeof studioSfxPayloadSchema>;
export type ListStudioAssetsQuery = z.infer<typeof listStudioAssetsQuerySchema>;
