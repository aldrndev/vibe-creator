import { z } from 'zod';
import { api, authFetch } from '@/services/api';
import { exportApi } from '@/services/export-api';

export const LOOP_CREATOR_PROJECT_KIND = 'loop-creator-project';

export const loopCreatorProjectDocumentSchema = z.object({
  kind: z.literal(LOOP_CREATOR_PROJECT_KIND),
  schemaVersion: z.literal(1),
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
    aspectRatio: z.enum(['original', '16:9', '9:16', '1:1', '4:5']),
  }),
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

const sourceInfoSchema = z.object({
  projectId: z.string(),
  title: z.string(),
  assetId: z.string(),
  assetName: z.string(),
  sourceUrl: z.string().nullable(),
  durationMs: z.number().int().positive(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  hasAudio: z.boolean(),
});

const loopPreviewStatusSchema = z.enum(['QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'EXPIRED']);

const loopPreviewResponseSchema = z.object({
  previewId: z.string(),
  status: loopPreviewStatusSchema,
  progress: z.number().min(0).max(100),
  phase: z.string(),
  reused: z.boolean(),
  previewUrl: z.string().optional(),
  expiresAt: z.string().datetime().optional(),
  errorMessage: z.string().optional(),
});

const loopPreviewEventSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('snapshot'),
    previewId: z.string(),
    status: loopPreviewStatusSchema,
    progress: z.number(),
    phase: z.string(),
  }),
  z.object({
    type: z.literal('progress'),
    previewId: z.string(),
    status: z.literal('PROCESSING'),
    progress: z.number(),
    phase: z.string(),
    message: z.string(),
  }),
  z.object({
    type: z.literal('completed'),
    previewId: z.string(),
    status: z.literal('COMPLETED'),
    progress: z.literal(100),
    previewUrl: z.string(),
    expiresAt: z.string().datetime(),
  }),
  z.object({
    type: z.literal('failed'),
    previewId: z.string(),
    status: z.literal('FAILED'),
    errorMessage: z.string(),
  }),
  z.object({
    type: z.literal('expired'),
    previewId: z.string(),
    status: z.literal('EXPIRED'),
    errorMessage: z.string(),
  }),
]);

export type LoopCreatorProjectDocument = z.infer<typeof loopCreatorProjectDocumentSchema>;
export type LoopSourceInfo = z.infer<typeof sourceInfoSchema>;
export type LoopPreviewResponse = z.infer<typeof loopPreviewResponseSchema>;
export type LoopPreviewEvent = z.infer<typeof loopPreviewEventSchema>;

export interface LoopProjectSession {
  readonly id: string;
  readonly title: string;
  readonly document: LoopCreatorProjectDocument;
  readonly sourceInfo?: LoopSourceInfo;
  readonly videoUrl?: string;
}

export function createDefaultLoopDocument(): LoopCreatorProjectDocument {
  return {
    kind: LOOP_CREATOR_PROJECT_KIND,
    schemaVersion: 1,
    savedAt: new Date().toISOString(),
    trim: { enabled: false, startMs: 0 },
    audioMuted: false,
    transition: { mode: 'smooth' },
    output: { targetDurationMs: 5 * 60 * 1000, aspectRatio: 'original' },
  };
}

export function createLoopProjectTitle(filename: string): string {
  const base =
    filename
      .replace(/\.[^.]+$/, '')
      .replace(/[-_]+/g, ' ')
      .trim() || 'Video';
  return `${base} Loop`;
}

export async function createLoopProject(title: string): Promise<LoopProjectSession> {
  const document = createDefaultLoopDocument();
  const response = await api.post<unknown>('/projects', {
    title,
    description: 'Created with Loop Creator',
    mode: 'TIMELINE',
    storyData: document,
  });
  if (!response.success) {
    throw new Error(response.error.message || 'Gagal membuat draft Loop Creator.');
  }
  const project = projectRecordSchema.parse(response.data);
  return { id: project.id, title: project.title, document };
}

export async function saveLoopProject(
  projectId: string,
  title: string,
  document: LoopCreatorProjectDocument,
): Promise<void> {
  const response = await api.patch<unknown>(`/projects/${projectId}`, {
    title,
    description: 'Created with Loop Creator',
    mode: 'TIMELINE',
    storyData: {
      ...document,
      savedAt: new Date().toISOString(),
    },
  });
  if (!response.success) {
    throw new Error(response.error.message || 'Gagal menyimpan draft Loop Creator.');
  }
}

export async function uploadLoopSource(projectId: string, file: File): Promise<string> {
  const upload = await exportApi.uploadMedia(file);
  const assetId = crypto.randomUUID();
  const response = await api.post<unknown>(`/projects/${projectId}/assets/from-upload-token`, {
    assetId,
    uploadToken: upload.uploadToken,
    name: file.name,
    type: 'VIDEO',
    mimeType: upload.mimetype,
    size: upload.size,
  });
  if (!response.success) {
    throw new Error(response.error.message || 'Gagal menyimpan video sumber.');
  }
  return assetId;
}

export async function getLoopSourceInfo(projectId: string): Promise<LoopSourceInfo> {
  const response = await api.get<unknown>(`/loop/projects/${projectId}/source`);
  if (!response.success) {
    throw new Error(response.error.message || 'Video sumber tidak tersedia.');
  }
  return sourceInfoSchema.parse(response.data);
}

async function loadSourceBlob(sourceUrl: string | null): Promise<string | undefined> {
  if (!sourceUrl) return undefined;
  const response = await authFetch(sourceUrl);
  if (!response.ok) return undefined;
  return URL.createObjectURL(await response.blob());
}

export async function loadLoopProject(projectId: string): Promise<LoopProjectSession> {
  const response = await api.get<unknown>(`/projects/${projectId}`);
  if (!response.success) {
    throw new Error(response.error.message || 'Draft Loop Creator tidak ditemukan.');
  }
  const project = projectRecordSchema.parse(response.data);
  const document = loopCreatorProjectDocumentSchema.parse(project.storyData);

  if (!document.sourceAssetId) {
    return { id: project.id, title: project.title, document };
  }

  const sourceInfo = await getLoopSourceInfo(project.id);
  return {
    id: project.id,
    title: project.title,
    document,
    sourceInfo,
    videoUrl: await loadSourceBlob(sourceInfo.sourceUrl),
  };
}

export async function createLoopPreview(projectId: string): Promise<LoopPreviewResponse> {
  const response = await api.post<unknown>(`/loop/projects/${projectId}/preview`, {});
  if (!response.success) {
    throw new Error(response.error.message || 'Preview loop belum dapat dibuat.');
  }
  return loopPreviewResponseSchema.parse(response.data);
}

export async function getLoopPreviewStatus(previewId: string): Promise<LoopPreviewResponse> {
  const response = await api.get<unknown>(`/loop/previews/${previewId}/status`);
  if (!response.success) {
    throw new Error(response.error.message || 'Status preview belum dapat dimuat.');
  }
  return loopPreviewResponseSchema.parse(response.data);
}

export async function loadLoopPreviewBlob(previewId: string): Promise<string> {
  const response = await authFetch(`/api/v1/loop/previews/${previewId}/file`);
  if (!response.ok) {
    throw new Error('Preview loop belum dapat dimuat.');
  }
  return URL.createObjectURL(await response.blob());
}

export function subscribeToLoopPreviewEvents(
  previewId: string,
  handlers: {
    readonly onEvent: (event: LoopPreviewEvent) => void;
    readonly onError: () => void;
  },
): () => void {
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  const source = new EventSource(`${baseUrl}/api/v1/loop/previews/${previewId}/events`, {
    withCredentials: true,
  });
  source.onmessage = (message) => {
    try {
      const event = loopPreviewEventSchema.safeParse(JSON.parse(message.data));
      if (event.success) {
        handlers.onEvent(event.data);
      }
    } catch {
      source.close();
      handlers.onError();
    }
  };
  source.onerror = () => {
    source.close();
    handlers.onError();
  };
  return () => source.close();
}
