import { z } from 'zod';

export const promptTypeSchema = z.enum([
  'SCRIPT',
  'VOICE',
  'VIDEO_GEN',
  'IMAGE',
  'RELAXING',
  'CREATIVE_SCAN',
  'LOOP_SOURCE',
  'TALKING_HEAD',
  'SOCIAL_COPY',
]);

const existingPromptTypeSchema = z.enum([
  'SCRIPT',
  'VOICE',
  'VIDEO_GEN',
  'IMAGE',
  'RELAXING',
  'CREATIVE_SCAN',
  'TALKING_HEAD',
  'SOCIAL_COPY',
]);

export const loopSourcePromptInputSchema = z
  .object({
    type: z.literal('LOOP_SOURCE'),
    sceneId: z.enum([
      'cozy-fireplace',
      'forest-river',
      'rainy-window',
      'ocean-shore',
      'night-campfire',
      'waterfall-retreat',
      'mountain-stream',
      'cozy-cafe-rain',
      'aquarium-calm',
      'custom',
    ]),
    customScene: z
      .object({
        environment: z.string().trim().min(10).max(400),
        focalPoint: z.string().trim().min(3).max(240),
        continuousMotion: z.string().trim().min(10).max(400),
        nativeAudio: z.string().trim().min(10).max(400),
      })
      .optional(),
    mood: z.enum([
      'natural-calm',
      'cozy-warm',
      'cinematic-peaceful',
      'meditative',
      'sleep-ambience',
    ]),
    lighting: z.enum([
      'morning-soft-light',
      'golden-hour',
      'evening-warm-light',
      'night-ambient-light',
      'overcast-calm',
    ]),
    aspectRatio: z.enum(['16:9', '9:16', '1:1', '4:5']),
    durationSeconds: z.union([z.literal(8), z.literal(10), z.literal(15)]),
    visualStyle: z.enum([
      'photorealistic',
      'cinematic-natural',
      'ultra-realistic',
      'soft-cozy',
      'ambient-documentary',
    ]),
    additionalDetail: z.string().trim().max(400).optional(),
  })
  .superRefine((value, context) => {
    if (value.sceneId === 'custom' && !value.customScene) {
      context.addIssue({
        code: 'custom',
        path: ['customScene'],
        message: 'Detail custom scene diperlukan.',
      });
    }
  });

export const createPromptSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('LOOP_SOURCE'),
    title: z.string().min(1, 'Judul diperlukan').max(200),
    inputData: loopSourcePromptInputSchema,
  }),
  z.object({
    type: existingPromptTypeSchema,
    title: z.string().min(1, 'Judul diperlukan').max(200),
    inputData: z.record(z.string(), z.unknown()),
  }),
]);

export const createVersionSchema = z.object({
  inputData: z.record(z.string(), z.unknown()),
  userNotes: z.string().optional(),
});
