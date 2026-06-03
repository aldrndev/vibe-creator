import { z } from 'zod';

export const LIVE_STREAM_PROJECT_KIND = 'live-stream-project';

export const streamPlatformSchema = z.enum([
  'youtube',
  'tiktok',
  'twitch',
  'facebook',
  'instagram',
  'custom',
]);

export const streamQualitySchema = z.enum(['720p', '1080p']);

function isPrivateHost(hostname: string): boolean {
  const normalizedHost = hostname.toLowerCase();
  return (
    normalizedHost === 'localhost' ||
    normalizedHost === '::1' ||
    normalizedHost === '[::1]' ||
    normalizedHost.startsWith('127.') ||
    normalizedHost.startsWith('10.') ||
    normalizedHost.startsWith('192.168.') ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(normalizedHost)
  );
}

export const customRtmpUrlSchema = z
  .string()
  .url()
  .refine((value) => /^rtmps?:\/\//i.test(value), {
    message: 'Custom RTMP URL must use rtmp:// or rtmps://',
  })
  .refine(
    (value) => {
      const parsed = new URL(value);
      return !isPrivateHost(parsed.hostname);
    },
    {
      message: 'Custom RTMP URL must not target private or loopback hosts',
    },
  );

export const liveStreamProjectDocumentSchema = z.object({
  kind: z.literal(LIVE_STREAM_PROJECT_KIND),
  schemaVersion: z.literal(1),
  savedAt: z.string().datetime(),
  sourceAssetId: z.string().min(1).optional(),
  platform: streamPlatformSchema.default('youtube'),
  quality: streamQualitySchema.default('720p'),
  bitrateKbps: z.number().int().min(500).max(10_000).default(2500),
  durationMinutes: z.number().int().min(1).max(1440).default(60),
  customRtmpUrl: customRtmpUrlSchema.optional(),
  title: z.string().min(1).max(255).default('Live Stream Baru'),
});

export const projectStreamStartBodySchema = z.object({
  streamKey: z.string().min(1).max(500),
  customRtmpUrl: customRtmpUrlSchema.optional(),
});

export const streamHistoryQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().optional(),
});

export const streamStatusResponseSchema = z.object({
  id: z.string(),
  platform: z.string(),
  status: z.enum(['CREATED', 'STARTING', 'LIVE', 'STOPPING', 'STOPPED', 'FAILED', 'ENDED']),
  startedAt: z.date(),
  endedAt: z.date().nullable(),
  autoStopAt: z.date().nullable(),
  durationMinutesBilled: z.number().int().nullable(),
  stopReason: z
    .enum([
      'USER_REQUEST',
      'AUTO_STOP',
      'ERROR',
      'ADMIN',
      'SERVER_RESTART',
      'QUOTA_EXHAUSTED',
      'REPLACED_BY_NEW_STREAM',
      'PROCESS_LOST',
    ])
    .nullable(),
  errorMessage: z.string().nullable(),
  config: z.looseObject({}).nullable(),
  isActive: z.boolean().optional(),
});

export const streamHistoryResponseSchema = z.object({
  streams: z.array(streamStatusResponseSchema),
  nextCursor: z.string().nullable(),
});

export type LiveStreamProjectDocument = z.infer<typeof liveStreamProjectDocumentSchema>;
export type StreamPlatformInput = z.infer<typeof streamPlatformSchema>;
export type StreamQualityInput = z.infer<typeof streamQualitySchema>;
