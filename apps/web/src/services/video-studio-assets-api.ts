import { z } from 'zod';
import { api, getApiUrl } from '@/services/api';
import type { EditorAsset } from '@/stores/editor-store';

export const videoStudioAssetKindSchema = z.enum(['text', 'audio', 'element']);

const textPreviewVariantSchema = z.enum([
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

const textPayloadSchema = z.object({
  kind: z.enum(['text-layer', 'element-layer']),
  text: z.string(),
  durationMs: z.number(),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  data: z.object({
    fontSize: z.number(),
    fontWeight: z.enum(['normal', 'bold']),
    fontStyle: z.enum(['normal', 'italic']).default('normal'),
    color: z.string(),
    backgroundColor: z.string().optional(),
    textAlign: z.enum(['left', 'center', 'right']),
    animation: z.enum(['none', 'fade', 'slide-up', 'slide-down', 'typewriter']),
  }),
  preview: z.object({
    variant: textPreviewVariantSchema,
    badge: z.string(),
    title: z.string(),
    subtitle: z.string(),
  }),
});

const audioSfxPayloadSchema = z.object({
  kind: z.literal('audio-sfx'),
  fileName: z.string(),
  waveform: z.string(),
  durationMs: z.number(),
  frequencyHz: z.number(),
  endFrequencyHz: z.number().optional(),
  volume: z.number(),
  attackMs: z.number(),
  releaseMs: z.number(),
});

const audioFilePayloadSchema = z.object({
  kind: z.literal('audio-file'),
  fileName: z.string(),
  mimeType: z.enum(['audio/mpeg', 'audio/ogg', 'audio/wav']),
  durationMs: z.number(),
});

const audioPayloadSchema = z.discriminatedUnion('kind', [
  audioSfxPayloadSchema,
  audioFilePayloadSchema,
]);

const videoStudioAssetSchema = z.object({
  id: z.string(),
  kind: videoStudioAssetKindSchema,
  title: z.string(),
  description: z.string(),
  category: z.string(),
  tags: z.array(z.string()),
  thumbnailUrl: z.string().nullable(),
  previewUrl: z.string().nullable(),
  payload: z.union([textPayloadSchema, audioPayloadSchema]),
  durationMs: z.number().nullable(),
  license: z.object({
    name: z.string(),
    sourceUrl: z.string().nullable(),
    attributionRequired: z.boolean(),
    commercialUse: z.boolean(),
  }),
  source: z.string(),
  sortOrder: z.number(),
});

const videoStudioAssetListSchema = z.object({
  items: z.array(videoStudioAssetSchema),
  nextCursor: z.string().nullable(),
  hasMore: z.boolean(),
});

const projectAssetRecordSchema = z
  .object({
    id: z.string(),
    sourceUrl: z.string().nullable().optional(),
  })
  .passthrough();

export type VideoStudioAsset = z.infer<typeof videoStudioAssetSchema>;
export type VideoStudioAssetKind = z.infer<typeof videoStudioAssetKindSchema>;
export type VideoStudioTextPayload = z.infer<typeof textPayloadSchema>;
export type VideoStudioAssetList = z.infer<typeof videoStudioAssetListSchema>;

export interface ListVideoStudioAssetsParams {
  readonly kind?: VideoStudioAssetKind;
  readonly category?: string;
  readonly q?: string;
  readonly cursor?: string;
  readonly limit?: number;
}

function buildAssetQuery(params: ListVideoStudioAssetsParams): string {
  const searchParams = new URLSearchParams();

  if (params.kind) searchParams.set('kind', params.kind);
  if (params.category) searchParams.set('category', params.category);
  if (params.q) searchParams.set('q', params.q);
  if (params.cursor) searchParams.set('cursor', params.cursor);
  if (params.limit) searchParams.set('limit', String(params.limit));

  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

function normalizeAssetUrls(asset: VideoStudioAsset): VideoStudioAsset {
  return {
    ...asset,
    thumbnailUrl: asset.thumbnailUrl ? getApiUrl(asset.thumbnailUrl) : null,
    previewUrl: asset.previewUrl ? getApiUrl(asset.previewUrl) : null,
  };
}

/**
 * Loads Video Studio catalog assets from the backend catalog.
 */
export async function listVideoStudioAssets(
  params: ListVideoStudioAssetsParams = {},
): Promise<VideoStudioAssetList> {
  const response = await api.get<unknown>(`/video-studio/assets${buildAssetQuery(params)}`);

  if (!response.success) {
    throw new Error(response.error.message || 'Gagal memuat asset Video Studio.');
  }

  const parsed = videoStudioAssetListSchema.parse(response.data);
  return {
    ...parsed,
    items: parsed.items.map(normalizeAssetUrls),
  };
}

/**
 * Loads every page from the backend catalog so larger asset packs do not disappear behind pagination.
 */
export async function listAllVideoStudioAssets(
  params: Omit<ListVideoStudioAssetsParams, 'cursor'> = {},
): Promise<VideoStudioAssetList> {
  const items: VideoStudioAsset[] = [];
  let cursor: string | undefined;
  let hasMore = true;

  while (hasMore) {
    const page = await listVideoStudioAssets({
      ...params,
      cursor,
      limit: params.limit ?? 50,
    });

    items.push(...page.items);
    cursor = page.nextCursor ?? undefined;
    hasMore = page.hasMore && Boolean(cursor);
  }

  return {
    items,
    nextCursor: null,
    hasMore: false,
  };
}

/**
 * Attaches a built-in studio asset to a project as a persistent project asset.
 */
export async function attachStudioAssetToProject(
  projectId: string,
  asset: EditorAsset,
): Promise<EditorAsset> {
  if (!asset.studioAssetId) {
    throw new Error('Studio asset ID is required.');
  }

  const response = await api.post<unknown>(`/projects/${projectId}/assets/from-studio-asset`, {
    assetId: asset.id,
    studioAssetId: asset.studioAssetId,
  });

  if (!response.success) {
    throw new Error(response.error?.message || 'Gagal menyimpan studio asset.');
  }

  if (!response.data) {
    throw new Error('Gagal menyimpan studio asset.');
  }

  const record = projectAssetRecordSchema.parse(response.data);
  const serverUrl = record.sourceUrl ?? `/api/v1/projects/assets/${record.id}/file`;

  return {
    ...asset,
    serverAssetId: record.id,
    serverUrl,
  };
}
