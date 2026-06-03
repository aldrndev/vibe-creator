import { z } from 'zod';

export const REACTION_CREATOR_PROJECT_KIND = 'reaction-creator-project';
export const REACTION_CREATOR_SCHEMA_VERSION = 1;

export const reactionLayoutModeSchema = z.enum(['pip', 'side-by-side', 'vertical-short']);
export const reactionAspectRatioSchema = z.enum(['original', '16:9', '9:16', '1:1', '4:5']);
export const reactionPipPositionSchema = z.enum([
  'top-left',
  'top-right',
  'bottom-left',
  'bottom-right',
  'custom',
]);
export const reactionSplitOrientationSchema = z.enum(['horizontal', 'vertical']);
export const reactionMainPlacementSchema = z.enum(['start', 'end']);
export const reactionInputModeSchema = z.enum(['recorded', 'uploaded']);
export const reactionVideoFramingSchema = z
  .object({
    fit: z.enum(['cover', 'contain']).default('cover'),
    x: z.number().min(0).max(100).default(50),
    y: z.number().min(0).max(100).default(50),
    zoom: z.number().min(1).max(2).default(1),
  })
  .default({
    fit: 'cover',
    x: 50,
    y: 50,
    zoom: 1,
  });

export const reactionCreatorProjectDocumentSchema = z.object({
  kind: z.literal(REACTION_CREATOR_PROJECT_KIND),
  schemaVersion: z.literal(REACTION_CREATOR_SCHEMA_VERSION),
  savedAt: z.string().datetime(),
  mainAssetId: z.string().min(1).optional(),
  reactionAssetId: z.string().min(1).optional(),
  reactionInputMode: reactionInputModeSchema.optional(),
  layout: z.object({
    mode: reactionLayoutModeSchema,
    pipPosition: reactionPipPositionSchema,
    pipScale: z.number().min(0.12).max(0.5),
    circular: z.boolean(),
    splitOrientation: reactionSplitOrientationSchema,
    mainPlacement: reactionMainPlacementSchema.default('start'),
    splitRatio: z.number().min(0.3).max(0.7),
    smoothBorder: z.boolean(),
    blurOverlay: z.boolean().optional().default(false),
    mainFraming: reactionVideoFramingSchema,
    reactionFraming: reactionVideoFramingSchema,
  }),
  output: z.object({
    aspectRatio: reactionAspectRatioSchema,
  }),
  audio: z.object({
    mainVolume: z.number().min(0).max(2),
    reactionVolume: z.number().min(0).max(2),
    muteMain: z.boolean(),
    muteReaction: z.boolean(),
  }),
  sync: z.object({
    reactionOffsetMs: z.number().int().min(-2000).max(2000),
  }),
});

export const reactionRenderSpecSchema = z.object({
  kind: z.literal('reaction-render'),
  schemaVersion: z.literal(1),
  projectId: z.string().min(1),
  mainAssetPath: z.string().min(1),
  reactionAssetPath: z.string().min(1),
  mainHasAudio: z.boolean(),
  reactionHasAudio: z.boolean(),
  mainDurationMs: z.number().int().positive(),
  reactionDurationMs: z.number().int().positive(),
  layoutMode: reactionLayoutModeSchema,
  aspectRatio: reactionAspectRatioSchema,
  pipPosition: reactionPipPositionSchema,
  pipScale: z.number().min(0.12).max(0.5),
  circular: z.boolean(),
  splitOrientation: reactionSplitOrientationSchema,
  mainPlacement: reactionMainPlacementSchema.default('start'),
  splitRatio: z.number().min(0.3).max(0.7),
  smoothBorder: z.boolean(),
  blurOverlay: z.boolean().optional().default(false),
  mainFraming: reactionVideoFramingSchema,
  reactionFraming: reactionVideoFramingSchema,
  mainVolume: z.number().min(0).max(2),
  reactionVolume: z.number().min(0).max(2),
  muteMain: z.boolean(),
  muteReaction: z.boolean(),
  reactionOffsetMs: z.number().int().min(-2000).max(2000),
  outputDurationMs: z.number().int().positive(),
  outputWidth: z.number().int().positive(),
  outputHeight: z.number().int().positive(),
});

export const reactionProjectParamsSchema = z.object({
  id: z.string().min(1),
});

export const reactionSourceInfoResponseSchema = z.object({
  projectId: z.string().min(1),
  title: z.string(),
  main: z
    .object({
      assetId: z.string().min(1),
      assetName: z.string(),
      sourceUrl: z.string().nullable(),
      durationMs: z.number().int().positive(),
      width: z.number().int().positive(),
      height: z.number().int().positive(),
      hasAudio: z.boolean(),
    })
    .optional(),
  reaction: z
    .object({
      assetId: z.string().min(1),
      assetName: z.string(),
      sourceUrl: z.string().nullable(),
      durationMs: z.number().int().positive(),
      width: z.number().int().positive(),
      height: z.number().int().positive(),
      hasAudio: z.boolean(),
    })
    .optional(),
});

export const reactionRenderResponseSchema = z.object({
  jobId: z.string().min(1),
  status: z.string().min(1),
  progress: z.number().min(0).max(100),
  reused: z.boolean(),
  cacheState: z.enum(['none', 'active-job', 'completed-result']),
  downloadUrl: z.string().optional(),
  filename: z.string().optional(),
  urlExpiresAt: z.string().datetime().optional(),
  outputDurationMs: z.number().int().positive(),
  mainHasAudio: z.boolean(),
  reactionHasAudio: z.boolean(),
});

export type ReactionAspectRatio = z.infer<typeof reactionAspectRatioSchema>;
export type ReactionCreatorProjectDocument = z.infer<typeof reactionCreatorProjectDocumentSchema>;
export type ReactionLayoutMode = z.infer<typeof reactionLayoutModeSchema>;
export type ReactionRenderSpec = z.infer<typeof reactionRenderSpecSchema>;
