import { z } from 'zod';
import { api, authFetch } from '@/services/api';
import { exportApi } from '@/services/export-api';

export const LIVE_STREAM_PROJECT_KIND = 'live-stream-project';

export const liveStreamProjectDocumentSchema = z.object({
  kind: z.literal(LIVE_STREAM_PROJECT_KIND),
  schemaVersion: z.literal(1),
  savedAt: z.string().datetime(),
  sourceAssetId: z.string().min(1).optional(),
  platform: z.enum(['youtube', 'tiktok', 'twitch', 'facebook', 'instagram', 'custom']),
  quality: z.enum(['720p', '1080p']),
  bitrateKbps: z.number().int().min(500).max(10_000),
  durationMinutes: z.number().int().min(1).max(1440),
  customRtmpUrl: z.string().optional(),
  title: z.string().min(1).max(255),
});

const projectAssetSchema = z.object({
  id: z.string(),
  name: z.string(),
  sourceUrl: z.string().nullable().optional(),
  type: z.string(),
});

const projectRecordSchema = z.object({
  id: z.string(),
  title: z.string(),
  storyData: z.unknown(),
  assets: z.array(projectAssetSchema).optional().default([]),
});

const liveStreamSourceInfoSchema = z.object({
  projectId: z.string(),
  title: z.string(),
  source: z
    .object({
      assetId: z.string(),
      assetName: z.string(),
      sourceUrl: z.string().nullable(),
      durationMs: z.number().int().nonnegative(),
      width: z.number().int().positive(),
      height: z.number().int().positive(),
      hasAudio: z.boolean(),
    })
    .nullable(),
});

export const streamStatusSchema = z.object({
  id: z.string(),
  status: z.enum(['CREATED', 'STARTING', 'LIVE', 'STOPPING', 'STOPPED', 'FAILED', 'ENDED']),
  platform: z.string(),
  startedAt: z.string().or(z.date()),
  endedAt: z.string().or(z.date()).nullable().optional(),
  autoStopAt: z.string().or(z.date()).nullable().optional(),
  durationMinutesBilled: z.number().nullable().optional(),
  stopReason: z.string().nullable().optional(),
  errorMessage: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  config: z
    .object({
      quality: z.string().optional(),
      bitrateKbps: z.number().optional(),
      effectiveDurationMinutes: z.number().optional(),
    })
    .nullable()
    .optional(),
});

const startStreamResponseSchema = z.object({
  streamId: z.string(),
  status: z.string(),
  effectiveDurationMinutes: z.number(),
  autoStopAt: z.string(),
  quotaRemainingAfterReservation: z.number().optional(),
});

const streamQuotaSchema = z.object({
  remaining: z.number(),
  total: z.number(),
  used: z.number(),
  cycleEnd: z.string().or(z.date()).optional(),
});

const streamHistoryResponseSchema = z.object({
  streams: z.array(streamStatusSchema),
  nextCursor: z.string().nullable(),
});

export type LiveStreamProjectDocument = z.infer<typeof liveStreamProjectDocumentSchema>;
export type LiveStreamSourceInfo = z.infer<typeof liveStreamSourceInfoSchema>;
export type StreamStatusRecord = z.infer<typeof streamStatusSchema>;
export type StreamQuota = z.infer<typeof streamQuotaSchema>;

export interface LiveStreamProjectSession {
  readonly id: string;
  readonly title: string;
  readonly document: LiveStreamProjectDocument;
  readonly sourceInfo?: LiveStreamSourceInfo;
  readonly sourceVideoUrl?: string;
}

export function createDefaultLiveStreamDocument(
  title = 'Live Stream Baru',
): LiveStreamProjectDocument {
  return {
    kind: LIVE_STREAM_PROJECT_KIND,
    schemaVersion: 1,
    savedAt: new Date().toISOString(),
    platform: 'youtube',
    quality: '720p',
    bitrateKbps: 2500,
    durationMinutes: 60,
    title,
  };
}

export function createLiveStreamProjectTitle(filename: string): string {
  const base =
    filename
      .replace(/\.[^.]+$/, '')
      .replace(/[-_]+/g, ' ')
      .trim() || 'Live Stream';
  return `${base} Live`;
}

export async function createLiveStreamProject(title: string): Promise<LiveStreamProjectSession> {
  const document = createDefaultLiveStreamDocument(title);
  const response = await api.post<unknown>('/projects', {
    title,
    description: 'Created with Live Streaming',
    mode: 'TIMELINE',
    storyData: document,
  });
  if (!response.success) {
    throw new Error(response.error.message || 'Gagal membuat draft Live Streaming.');
  }
  const project = projectRecordSchema.parse(response.data);
  return { id: project.id, title: project.title, document };
}

export async function saveLiveStreamProject(
  projectId: string,
  title: string,
  document: LiveStreamProjectDocument,
): Promise<void> {
  const response = await api.patch<unknown>(`/projects/${projectId}`, {
    title,
    description: 'Created with Live Streaming',
    mode: 'TIMELINE',
    storyData: {
      ...document,
      title,
      savedAt: new Date().toISOString(),
    },
  });
  if (!response.success) {
    throw new Error(response.error.message || 'Gagal menyimpan draft Live Streaming.');
  }
}

export async function uploadLiveStreamSourceAsset(projectId: string, file: File): Promise<string> {
  const upload = await exportApi.uploadMedia(file);
  const assetId = crypto.randomUUID();
  const response = await api.post<unknown>(`/projects/${projectId}/assets/from-upload-token`, {
    assetId,
    uploadToken: upload.uploadToken,
    name: file.name,
    type: 'VIDEO',
    libraryPurpose: 'media',
    mimeType: upload.mimetype,
    size: upload.size,
  });
  if (!response.success) {
    throw new Error(response.error.message || 'Gagal menyimpan source video.');
  }
  return assetId;
}

export async function getLiveStreamSourceInfo(projectId: string): Promise<LiveStreamSourceInfo> {
  const response = await api.get<unknown>(`/stream/projects/${projectId}/source`);
  if (!response.success) {
    throw new Error(response.error.message || 'Source video tidak tersedia.');
  }
  return liveStreamSourceInfoSchema.parse(response.data);
}

async function loadSourceBlob(sourceUrl: string | null | undefined): Promise<string | undefined> {
  if (!sourceUrl) return undefined;
  const response = await authFetch(sourceUrl);
  if (!response.ok) return undefined;
  return URL.createObjectURL(await response.blob());
}

export async function loadLiveStreamProject(projectId: string): Promise<LiveStreamProjectSession> {
  const response = await api.get<unknown>(`/projects/${projectId}`);
  if (!response.success) {
    throw new Error(response.error.message || 'Project Live Streaming tidak ditemukan.');
  }
  const project = projectRecordSchema.parse(response.data);
  const document = liveStreamProjectDocumentSchema.parse(project.storyData);
  const sourceInfo = await getLiveStreamSourceInfo(project.id).catch(() => undefined);
  const sourceVideoUrl = await loadSourceBlob(sourceInfo?.source?.sourceUrl);
  return {
    id: project.id,
    title: project.title,
    document,
    sourceInfo,
    sourceVideoUrl,
  };
}

export async function startLiveStreamProject(input: {
  projectId: string;
  streamKey: string;
  customRtmpUrl?: string;
}) {
  const response = await api.post<unknown>(`/stream/projects/${input.projectId}/start`, {
    streamKey: input.streamKey,
    customRtmpUrl: input.customRtmpUrl || undefined,
  });
  if (!response.success) {
    throw new Error(response.error.message || 'Gagal memulai live stream.');
  }
  return startStreamResponseSchema.parse(response.data);
}

export async function getStreamStatus(streamId: string): Promise<StreamStatusRecord> {
  const response = await api.get<unknown>(`/stream/${streamId}/status`);
  if (!response.success) {
    throw new Error(response.error.message || 'Gagal memuat status stream.');
  }
  return streamStatusSchema.parse(response.data);
}

export async function getActiveStream(): Promise<StreamStatusRecord | null> {
  const response = await api.get<unknown>('/stream/active');
  if (!response.success) {
    return null;
  }
  const data = z.object({ streams: z.array(streamStatusSchema) }).parse(response.data);
  return data.streams[0] ?? null;
}

export async function stopStream(streamId: string): Promise<void> {
  const response = await api.post<unknown>('/stream/stop', { streamId });
  if (!response.success) {
    throw new Error(response.error.message || 'Gagal menghentikan live stream.');
  }
}

export async function getStreamQuota(): Promise<StreamQuota> {
  const response = await api.get<unknown>('/billing/quota');
  if (!response.success) {
    throw new Error(response.error.message || 'Gagal memuat quota live stream.');
  }
  return streamQuotaSchema.parse(response.data);
}

export async function getStreamHistory(
  input: { limit?: number; cursor?: string | null } = {},
): Promise<z.infer<typeof streamHistoryResponseSchema>> {
  const query = new URLSearchParams({ limit: String(input.limit ?? 20) });
  if (input.cursor) {
    query.set('cursor', input.cursor);
  }

  const response = await api.get<unknown>(`/stream/history?${query.toString()}`);
  if (!response.success) {
    throw new Error(response.error.message || 'Gagal memuat riwayat stream.');
  }

  return streamHistoryResponseSchema.parse(response.data);
}
