import type { ModernProject } from '@vibe-creator/shared';
import { z } from 'zod';
import {
  createSerializableModernEditorAssets,
  modernEditorProjectSchema,
  type SerializableModernEditorAsset,
  serializableModernEditorAssetSchema,
} from '@/lib/modern-editor-drafts';
import { api, authFetch } from '@/services/api';
import { exportApi } from '@/services/export-api';
import { attachStudioAssetToProject } from '@/services/video-studio-assets-api';
import type { EditorAsset } from '@/stores/editor-store';

const VIDEO_STUDIO_PROJECT_KIND = 'video-studio-modern-project';
const VIDEO_STUDIO_PROJECT_SCHEMA_VERSION = 1;
const VIDEO_STUDIO_PROJECT_DESCRIPTION = 'Created with Video Studio';
const LOCAL_PROJECT_ID_PREFIXES = ['project-', 'local-project-'] as const;

const videoStudioProjectPayloadSchema = z.object({
  kind: z.literal(VIDEO_STUDIO_PROJECT_KIND),
  schemaVersion: z.literal(VIDEO_STUDIO_PROJECT_SCHEMA_VERSION),
  savedAt: z.string().datetime(),
  project: modernEditorProjectSchema,
  assets: z.array(serializableModernEditorAssetSchema),
});

const projectRecordSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    description: z.string().nullable().optional(),
    mode: z.enum(['STORY', 'TIMELINE']).optional(),
    storyData: z.unknown().nullable().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
  })
  .passthrough();

const projectAssetRecordSchema = z
  .object({
    id: z.string(),
    sourceUrl: z.string().nullable().optional(),
  })
  .passthrough();

type VideoStudioProjectPayload = z.infer<typeof videoStudioProjectPayloadSchema>;

interface ProjectSaveBody {
  readonly title: string;
  readonly description: string;
  readonly mode: 'TIMELINE';
  readonly storyData: VideoStudioProjectPayload;
}

interface ProjectApiError {
  readonly code: string;
  readonly message: string;
}

interface ProjectApiResponse<T> {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: ProjectApiError;
}

function getApiErrorMessage(
  response: { readonly error?: ProjectApiError },
  fallback: string,
): string {
  return response.error?.message ?? fallback;
}

/**
 * A backend-backed Video Studio editing session loaded from the generic projects API.
 */
export interface VideoStudioProjectSession {
  readonly id: string;
  readonly title: string;
  readonly savedAt: string;
  readonly project: ModernProject;
  readonly assets: EditorAsset[];
}

/**
 * Returns true for temporary local IDs that still need a backend Project ID.
 */
export function isLocalVideoStudioSessionId(projectId: string): boolean {
  return LOCAL_PROJECT_ID_PREFIXES.some((prefix) => projectId.startsWith(prefix));
}

/**
 * Builds the JSON document stored in Project.storyData for Video Studio sessions.
 */
export function buildVideoStudioProjectPayload(
  project: ModernProject,
  assets: readonly EditorAsset[],
  savedAt = new Date().toISOString(),
): VideoStudioProjectPayload {
  return videoStudioProjectPayloadSchema.parse({
    kind: VIDEO_STUDIO_PROJECT_KIND,
    schemaVersion: VIDEO_STUDIO_PROJECT_SCHEMA_VERSION,
    savedAt,
    project,
    assets: createSerializableModernEditorAssets(assets),
  });
}

/**
 * Parses a Project API record into a Video Studio session and normalizes the project ID.
 */
export function parseVideoStudioProjectRecord(record: unknown): VideoStudioProjectSession {
  const projectRecord = projectRecordSchema.parse(record);
  const payload = videoStudioProjectPayloadSchema.parse(projectRecord.storyData);

  return {
    id: projectRecord.id,
    title: projectRecord.title,
    savedAt: payload.savedAt,
    project: {
      ...payload.project,
      id: projectRecord.id,
      title: projectRecord.title || payload.project.title,
    },
    assets: payload.assets,
  };
}

async function hydrateRemoteAsset(asset: SerializableModernEditorAsset): Promise<EditorAsset> {
  if (!asset.serverUrl || asset.url.startsWith('blob:')) {
    return { ...asset };
  }

  try {
    const response = await authFetch(asset.serverUrl);
    if (!response.ok) {
      return { ...asset };
    }

    const blob = await response.blob();
    return {
      ...asset,
      url: URL.createObjectURL(blob),
    };
  } catch {
    return { ...asset };
  }
}

async function hydrateRemoteAssets(
  assets: readonly SerializableModernEditorAsset[],
): Promise<EditorAsset[]> {
  return Promise.all(assets.map((asset) => hydrateRemoteAsset(asset)));
}

/**
 * Loads a Video Studio session by the session/project ID in the URL.
 */
export async function loadVideoStudioProjectSession(
  sessionId: string,
): Promise<VideoStudioProjectSession> {
  const response = await api.get<unknown>(`/projects/${sessionId}`);
  if (!response.success) {
    throw new Error(response.error.message || 'Draft Video Studio tidak ditemukan.');
  }

  const session = parseVideoStudioProjectRecord(response.data);
  return {
    ...session,
    assets: await hydrateRemoteAssets(session.assets),
  };
}

/**
 * Saves a Video Studio session. Local temp IDs are upgraded to backend Project IDs.
 */
export async function saveVideoStudioProjectSession(
  project: ModernProject,
  assets: readonly EditorAsset[],
): Promise<VideoStudioProjectSession> {
  if (isLocalVideoStudioSessionId(project.id)) {
    return createVideoStudioProjectSession(project, assets);
  }

  const response = await api.patch<unknown>(
    `/projects/${project.id}`,
    createProjectSaveBody(project, assets),
  );

  if (response.success) {
    const session = parseVideoStudioProjectRecord(response.data);
    if (!hasUnpersistedProjectAssets(assets)) {
      return { ...session, assets: [...assets] };
    }

    const persistedAssets = await persistVideoStudioProjectAssets(project.id, assets);
    const persistedResponse = await api.patch<unknown>(
      `/projects/${project.id}`,
      createProjectSaveBody(project, persistedAssets),
    );
    if (!persistedResponse.success || !persistedResponse.data) {
      throw new Error(
        getApiErrorMessage(
          persistedResponse as ProjectApiResponse<unknown>,
          'Gagal menyimpan media project.',
        ),
      );
    }
    const persistedSession = parseVideoStudioProjectRecord(persistedResponse.data);
    return { ...persistedSession, assets: persistedAssets };
  }

  if (response.error.code === 'NOT_FOUND') {
    return createVideoStudioProjectSession(project, assets);
  }

  throw new Error(response.error.message || 'Gagal menyimpan draft Video Studio.');
}

function hasUnpersistedProjectAssets(assets: readonly EditorAsset[]): boolean {
  return assets.some((asset) =>
    Boolean((asset.file || asset.studioAssetId) && !asset.serverAssetId),
  );
}

function createProjectSaveBody(
  project: ModernProject,
  assets: readonly EditorAsset[],
): ProjectSaveBody {
  return {
    title: project.title,
    description: VIDEO_STUDIO_PROJECT_DESCRIPTION,
    mode: 'TIMELINE',
    storyData: buildVideoStudioProjectPayload(project, assets),
  };
}

async function createVideoStudioProjectSession(
  project: ModernProject,
  assets: readonly EditorAsset[],
): Promise<VideoStudioProjectSession> {
  const createResponse = (await api.post<unknown>(
    '/projects',
    createProjectSaveBody(project, assets),
  )) as ProjectApiResponse<unknown>;

  if (!createResponse.success || !createResponse.data) {
    throw new Error(createResponse.error?.message || 'Gagal membuat session Video Studio.');
  }

  const createdProject = projectRecordSchema.parse(createResponse.data);
  const normalizedProject: ModernProject = {
    ...project,
    id: createdProject.id,
  };

  const persistedAssets = await persistVideoStudioProjectAssets(createdProject.id, assets);
  const updateResponse = (await api.patch<unknown>(
    `/projects/${createdProject.id}`,
    createProjectSaveBody(normalizedProject, persistedAssets),
  )) as ProjectApiResponse<unknown>;

  if (!updateResponse.success || !updateResponse.data) {
    throw new Error(updateResponse.error?.message || 'Gagal menyimpan session Video Studio.');
  }

  const session = parseVideoStudioProjectRecord(updateResponse.data);
  return { ...session, assets: persistedAssets };
}

async function attachProjectAsset(
  projectId: string,
  asset: EditorAsset,
  uploadToken: string,
  mimeType: string,
  size: number,
): Promise<EditorAsset> {
  const response = await api.post<unknown>(`/projects/${projectId}/assets/from-upload-token`, {
    assetId: asset.id,
    uploadToken,
    name: asset.name,
    type: asset.type,
    mimeType,
    size,
    durationMs: asset.durationMs,
    width: asset.width,
    height: asset.height,
  });

  if (!response.success || !response.data) {
    throw new Error(
      getApiErrorMessage(response as ProjectApiResponse<unknown>, 'Gagal menyimpan media project.'),
    );
  }

  const record = projectAssetRecordSchema.parse(response.data);
  const serverUrl = record.sourceUrl ?? `/api/v1/projects/assets/${record.id}/file`;

  return {
    ...asset,
    serverAssetId: record.id,
    serverUrl,
    serverUploadToken: uploadToken,
  };
}

async function persistVideoStudioProjectAssets(
  projectId: string,
  assets: readonly EditorAsset[],
): Promise<EditorAsset[]> {
  const persistedAssets: EditorAsset[] = [];

  for (const asset of assets) {
    if (asset.studioAssetId && !asset.serverAssetId) {
      persistedAssets.push(await attachStudioAssetToProject(projectId, asset));
      continue;
    }

    if (!asset.file || asset.serverAssetId) {
      persistedAssets.push(asset);
      continue;
    }

    const upload = await exportApi.uploadMedia(asset.file);
    persistedAssets.push(
      await attachProjectAsset(projectId, asset, upload.uploadToken, upload.mimetype, upload.size),
    );
  }

  return persistedAssets;
}
