import { z } from 'zod';

export const LOOP_CREATOR_PROJECT_KIND = 'loop-creator-project';
export const LOOP_CREATOR_SCHEMA_VERSION = 1;

export const loopAspectRatioSchema = z.enum(['original', '16:9', '9:16', '1:1', '4:5']);
export const loopTransitionModeSchema = z.enum(['repeat', 'smooth']);

export const loopCreatorProjectDocumentSchema = z.object({
  kind: z.literal(LOOP_CREATOR_PROJECT_KIND),
  schemaVersion: z.literal(LOOP_CREATOR_SCHEMA_VERSION),
  savedAt: z.string().datetime(),
  sourceAssetId: z.string().min(1).optional(),
  trim: z.object({
    enabled: z.boolean(),
    startMs: z.number().int().nonnegative(),
    endMs: z.number().int().positive().optional(),
  }),
  audioMuted: z.boolean(),
  transition: z.discriminatedUnion('mode', [
    z.object({ mode: z.literal('repeat') }),
    z.object({ mode: z.literal('smooth') }),
  ]),
  output: z.object({
    targetDurationMs: z.number().int().positive(),
    aspectRatio: loopAspectRatioSchema,
  }),
});

export const loopRenderSpecSchema = z.object({
  kind: z.literal('loop-creator-render'),
  schemaVersion: z.literal(1),
  projectId: z.string().min(1),
  sourceAssetPath: z.string().min(1),
  sourceDurationMs: z.number().int().positive(),
  sourceHasAudio: z.boolean(),
  trimStartMs: z.number().int().nonnegative(),
  trimEndMs: z.number().int().positive(),
  selectedSegmentDurationMs: z.number().int().positive(),
  audioMuted: z.boolean(),
  transitionMode: loopTransitionModeSchema,
  transitionDurationMs: z.number().int().nonnegative(),
  cycleDurationMs: z.number().int().positive(),
  cycleCount: z.number().int().positive(),
  targetDurationMs: z.number().int().positive(),
  actualDurationMs: z.number().int().positive(),
  aspectRatio: loopAspectRatioSchema,
  outputWidth: z.number().int().positive(),
  outputHeight: z.number().int().positive(),
});

export const loopProjectParamsSchema = z.object({
  id: z.string().min(1),
});

export const loopPreviewParamsSchema = z.object({
  previewId: z.string().min(1),
});

export const loopSourceInfoResponseSchema = z.object({
  projectId: z.string().min(1),
  title: z.string(),
  assetId: z.string().min(1),
  assetName: z.string(),
  sourceUrl: z.string().nullable(),
  durationMs: z.number().int().positive(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  hasAudio: z.boolean(),
});

export const loopRenderResponseSchema = z.object({
  jobId: z.string().min(1),
  status: z.string().min(1),
  progress: z.number().min(0).max(100),
  reused: z.boolean(),
  cacheState: z.enum(['none', 'active-job', 'completed-result']),
  downloadUrl: z.string().optional(),
  filename: z.string().optional(),
  urlExpiresAt: z.string().datetime().optional(),
  actualDurationMs: z.number().int().positive(),
  cycleCount: z.number().int().positive(),
  adjustedToTier: z.boolean(),
  sourceHasAudio: z.boolean(),
});

export const loopPreviewStatusSchema = z.enum([
  'QUEUED',
  'PROCESSING',
  'COMPLETED',
  'FAILED',
  'EXPIRED',
]);

export const loopPreviewResponseSchema = z.object({
  previewId: z.string().min(1),
  status: loopPreviewStatusSchema,
  progress: z.number().min(0).max(100),
  phase: z.string().min(1),
  reused: z.boolean(),
  previewUrl: z.string().optional(),
  expiresAt: z.string().datetime().optional(),
  errorMessage: z.string().optional(),
});

export const loopPreviewEventSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('snapshot'),
    previewId: z.string().min(1),
    status: loopPreviewStatusSchema,
    progress: z.number().min(0).max(100),
    phase: z.string().min(1),
  }),
  z.object({
    type: z.literal('progress'),
    previewId: z.string().min(1),
    status: z.literal('PROCESSING'),
    progress: z.number().min(0).max(100),
    phase: z.string().min(1),
    message: z.string().min(1),
  }),
  z.object({
    type: z.literal('completed'),
    previewId: z.string().min(1),
    status: z.literal('COMPLETED'),
    progress: z.literal(100),
    previewUrl: z.string().min(1),
    expiresAt: z.string().datetime(),
  }),
  z.object({
    type: z.literal('failed'),
    previewId: z.string().min(1),
    status: z.literal('FAILED'),
    errorMessage: z.string().min(1),
  }),
  z.object({
    type: z.literal('expired'),
    previewId: z.string().min(1),
    status: z.literal('EXPIRED'),
    errorMessage: z.string().min(1),
  }),
]);

export type LoopAspectRatio = z.infer<typeof loopAspectRatioSchema>;
export type LoopCreatorProjectDocument = z.infer<typeof loopCreatorProjectDocumentSchema>;
export type LoopPreviewEvent = z.infer<typeof loopPreviewEventSchema>;
export type LoopPreviewResponse = z.infer<typeof loopPreviewResponseSchema>;
export type LoopRenderSpec = z.infer<typeof loopRenderSpecSchema>;
export type LoopTransitionMode = z.infer<typeof loopTransitionModeSchema>;
