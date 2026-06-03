import { z } from 'zod';
import { api, authFetch } from '@/services/api';
import { exportApi } from '@/services/export-api';

export const REACTION_CREATOR_PROJECT_KIND = 'reaction-creator-project';

const reactionVideoFramingSchema = z
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
  schemaVersion: z.literal(1),
  savedAt: z.string().datetime(),
  mainAssetId: z.string().min(1).optional(),
  reactionAssetId: z.string().min(1).optional(),
  reactionInputMode: z.enum(['recorded', 'uploaded']).optional(),
  layout: z.object({
    mode: z.enum(['pip', 'side-by-side', 'vertical-short']),
    pipPosition: z.enum(['top-left', 'top-right', 'bottom-left', 'bottom-right', 'custom']),
    pipScale: z.number().min(0.12).max(0.5),
    circular: z.boolean(),
    splitOrientation: z.enum(['horizontal', 'vertical']),
    mainPlacement: z.enum(['start', 'end']).default('start'),
    splitRatio: z.number().min(0.3).max(0.7),
    smoothBorder: z.boolean(),
    blurOverlay: z.boolean().optional().default(false),
    mainFraming: reactionVideoFramingSchema,
    reactionFraming: reactionVideoFramingSchema,
  }),
  output: z.object({
    aspectRatio: z.enum(['original', '16:9', '9:16', '1:1', '4:5']),
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

const reactionMediaInfoSchema = z.object({
  assetId: z.string(),
  assetName: z.string(),
  sourceUrl: z.string().nullable(),
  durationMs: z.number().int().positive(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  hasAudio: z.boolean(),
});

const reactionSourceInfoSchema = z.object({
  projectId: z.string(),
  title: z.string(),
  main: reactionMediaInfoSchema.optional(),
  reaction: reactionMediaInfoSchema.optional(),
});

export type ReactionCreatorProjectDocument = z.infer<typeof reactionCreatorProjectDocumentSchema>;
export type ReactionMediaInfo = z.infer<typeof reactionMediaInfoSchema>;
export type ReactionSourceInfo = z.infer<typeof reactionSourceInfoSchema>;

export interface ReactionProjectSession {
  readonly id: string;
  readonly title: string;
  readonly document: ReactionCreatorProjectDocument;
  readonly sourceInfo?: ReactionSourceInfo;
  readonly mainVideoUrl?: string;
  readonly reactionVideoUrl?: string;
}

export function createDefaultReactionDocument(): ReactionCreatorProjectDocument {
  return {
    kind: REACTION_CREATOR_PROJECT_KIND,
    schemaVersion: 1,
    savedAt: new Date().toISOString(),
    layout: {
      mode: 'pip',
      pipPosition: 'top-right',
      pipScale: 0.28,
      circular: false,
      splitOrientation: 'horizontal',
      mainPlacement: 'start',
      splitRatio: 0.5,
      smoothBorder: false,
      blurOverlay: false,
      mainFraming: {
        fit: 'cover',
        x: 50,
        y: 50,
        zoom: 1,
      },
      reactionFraming: {
        fit: 'cover',
        x: 50,
        y: 50,
        zoom: 1,
      },
    },
    output: { aspectRatio: '16:9' },
    audio: {
      mainVolume: 0.55,
      reactionVolume: 1,
      muteMain: false,
      muteReaction: false,
    },
    sync: { reactionOffsetMs: 0 },
  };
}

export function createReactionProjectTitle(filename: string): string {
  const base =
    filename
      .replace(/\.[^.]+$/, '')
      .replace(/[-_]+/g, ' ')
      .trim() || 'Video';
  return `${base} Reaction`;
}

export async function createReactionProject(title: string): Promise<ReactionProjectSession> {
  const document = createDefaultReactionDocument();
  const response = await api.post<unknown>('/projects', {
    title,
    description: 'Created with Reaction Creator',
    mode: 'TIMELINE',
    storyData: document,
  });
  if (!response.success) {
    throw new Error(response.error.message || 'Gagal membuat draft Reaction Creator.');
  }
  const project = projectRecordSchema.parse(response.data);
  return { id: project.id, title: project.title, document };
}

export async function saveReactionProject(
  projectId: string,
  title: string,
  document: ReactionCreatorProjectDocument,
): Promise<void> {
  const response = await api.patch<unknown>(`/projects/${projectId}`, {
    title,
    description: 'Created with Reaction Creator',
    mode: 'TIMELINE',
    storyData: {
      ...document,
      savedAt: new Date().toISOString(),
    },
  });
  if (!response.success) {
    throw new Error(response.error.message || 'Gagal menyimpan draft Reaction Creator.');
  }
}

export async function uploadReactionVideoAsset(
  projectId: string,
  file: File,
  libraryPurpose: 'media' | 'reaction',
): Promise<string> {
  const upload = await exportApi.uploadMedia(file);
  const assetId = crypto.randomUUID();
  const response = await api.post<unknown>(`/projects/${projectId}/assets/from-upload-token`, {
    assetId,
    uploadToken: upload.uploadToken,
    name: file.name,
    type: 'VIDEO',
    libraryPurpose,
    mimeType: upload.mimetype,
    size: upload.size,
  });
  if (!response.success) {
    throw new Error(response.error.message || 'Gagal menyimpan video.');
  }
  return assetId;
}

export async function getReactionSourceInfo(projectId: string): Promise<ReactionSourceInfo> {
  const response = await api.get<unknown>(`/reaction/projects/${projectId}/source`);
  if (!response.success) {
    throw new Error(response.error.message || 'Video reaction tidak tersedia.');
  }
  return reactionSourceInfoSchema.parse(response.data);
}

async function loadSourceBlob(sourceUrl: string | null | undefined): Promise<string | undefined> {
  if (!sourceUrl) return undefined;
  const response = await authFetch(sourceUrl);
  if (!response.ok) return undefined;
  return URL.createObjectURL(await response.blob());
}

export async function loadReactionProject(projectId: string): Promise<ReactionProjectSession> {
  const response = await api.get<unknown>(`/projects/${projectId}`);
  if (!response.success) {
    throw new Error(response.error.message || 'Draft Reaction Creator tidak ditemukan.');
  }
  const project = projectRecordSchema.parse(response.data);
  const document = reactionCreatorProjectDocumentSchema.parse(project.storyData);
  const sourceInfo = await getReactionSourceInfo(project.id).catch(() => undefined);

  return {
    id: project.id,
    title: project.title,
    document,
    sourceInfo,
    mainVideoUrl: await loadSourceBlob(sourceInfo?.main?.sourceUrl),
    reactionVideoUrl: await loadSourceBlob(sourceInfo?.reaction?.sourceUrl),
  };
}
