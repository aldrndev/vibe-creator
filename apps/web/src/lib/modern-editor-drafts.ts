import type { Layer, ModernProject } from '@vibe-creator/shared';
import { z } from 'zod';
import type { EditorAsset } from '@/stores/editor-store';

const DRAFT_STORAGE_KEY = 'vibe:video-studio:drafts';
const ACTIVE_DRAFT_DB_NAME = 'vibe-video-studio';
const ACTIVE_DRAFT_STORE = 'active-draft';
const ACTIVE_DRAFT_KEY = 'current';
const MAX_DRAFTS = 5;

type SerializableEditorAsset = Omit<EditorAsset, 'file'>;

/**
 * Editor asset shape that can be persisted as JSON without browser-only File objects.
 */
export type SerializableModernEditorAsset = SerializableEditorAsset;

export interface ModernEditorStoredAssetFile {
  readonly assetId: string;
  readonly file: File;
}

export interface ModernEditorDraft {
  readonly id: string;
  readonly title: string;
  readonly savedAt: string;
  readonly project: ModernProject;
  readonly assets: SerializableEditorAsset[];
}

interface ModernEditorActiveDraftRecord extends ModernEditorDraft {
  readonly key: typeof ACTIVE_DRAFT_KEY;
  readonly assetFiles: ModernEditorStoredAssetFile[];
}

export interface ModernEditorRestoredDraft extends Omit<ModernEditorDraft, 'assets'> {
  readonly assets: EditorAsset[];
}

/**
 * Zod contract for Video Studio assets stored in local drafts or backend project payloads.
 */
export const serializableModernEditorAssetSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['VIDEO', 'AUDIO', 'IMAGE']),
  libraryPurpose: z.enum(['media', 'background']).optional(),
  url: z.string(),
  durationMs: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  thumbnailUrl: z.string().optional(),
  thumbnails: z.array(z.string()).optional(),
  serverAssetId: z.string().optional(),
  serverUrl: z.string().optional(),
  serverUploadToken: z.string().optional(),
  studioAssetId: z.string().optional(),
});

const projectSettingsSchema = z.object({
  width: z.number(),
  height: z.number(),
  fps: z.union([z.literal(24), z.literal(30), z.literal(60)]),
  durationMs: z.number(),
  backgroundColor: z.string(),
  backgroundMode: z.enum(['solid', 'blur', 'gradient', 'image']).optional().default('blur'),
  backgroundOpacity: z.number().optional().default(1),
  backgroundBlurAmount: z.number().optional().default(18),
  backgroundBlurZoom: z.number().optional().default(1.08),
  backgroundDim: z.number().optional().default(0.08),
  backgroundSaturation: z.number().optional().default(1.05),
  backgroundGradientFrom: z.string().optional().default('#111827'),
  backgroundGradientTo: z.string().optional().default('#ff4b1f'),
  backgroundGradientAngle: z.number().optional().default(135),
  backgroundImageAssetId: z.string().nullable().optional().default(null),
  backgroundImageFit: z.enum(['contain', 'cover']).optional().default('cover'),
  backgroundImageBlurAmount: z.number().optional().default(0),
  backgroundImageDim: z.number().optional().default(0),
  backgroundImagePositionX: z.number().optional().default(50),
  backgroundImagePositionY: z.number().optional().default(50),
  backgroundImageScale: z.number().optional().default(1),
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isLayer(value: unknown): value is Layer {
  if (!isRecord(value)) {
    return false;
  }

  const type = value.type;
  return (
    typeof value.id === 'string' &&
    (type === 'video' || type === 'image' || type === 'text' || type === 'audio') &&
    isRecord(value.data) &&
    typeof value.startMs === 'number' &&
    typeof value.endMs === 'number'
  );
}

/**
 * Zod contract for the persisted ModernProject document.
 */
export const modernEditorProjectSchema = z.object({
  schemaVersion: z.number(),
  id: z.string(),
  title: z.string(),
  settings: projectSettingsSchema,
  layers: z.array(z.custom<Layer>(isLayer)),
});

const modernEditorDraftSchema = z.object({
  id: z.string(),
  title: z.string(),
  savedAt: z.string(),
  project: modernEditorProjectSchema,
  assets: z.array(serializableModernEditorAssetSchema),
});

const draftListSchema = z.array(modernEditorDraftSchema);

function isBrowserFile(value: unknown): value is File {
  return typeof File !== 'undefined' && value instanceof File;
}

const storedAssetFileSchema = z.object({
  assetId: z.string(),
  file: z.custom<File>(isBrowserFile),
});

const activeDraftRecordSchema = modernEditorDraftSchema.extend({
  key: z.literal(ACTIVE_DRAFT_KEY),
  assetFiles: z.array(storedAssetFileSchema),
});

function getDraftStorage(): Storage | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function readDrafts(): ModernEditorDraft[] {
  try {
    const storage = getDraftStorage();
    const raw = storage?.getItem(DRAFT_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = draftListSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

function writeDrafts(drafts: readonly ModernEditorDraft[]): void {
  const storage = getDraftStorage();
  if (!storage) {
    throw new Error('Draft storage is not available in this browser.');
  }

  storage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(drafts));
}

function getDraftIndexedDB(): IDBFactory | null {
  if (typeof indexedDB === 'undefined') {
    return null;
  }

  return indexedDB;
}

function openActiveDraftDatabase(): Promise<IDBDatabase> {
  const draftIndexedDB = getDraftIndexedDB();
  if (!draftIndexedDB) {
    return Promise.reject(new Error('Active draft storage is not available in this browser.'));
  }

  return new Promise((resolve, reject) => {
    const request = draftIndexedDB.open(ACTIVE_DRAFT_DB_NAME, 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(ACTIVE_DRAFT_STORE)) {
        database.createObjectStore(ACTIVE_DRAFT_STORE, { keyPath: 'key' });
      }
    };
  });
}

async function readActiveDraftRecord(): Promise<ModernEditorActiveDraftRecord | null> {
  const database = await openActiveDraftDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(ACTIVE_DRAFT_STORE, 'readonly');
    const store = transaction.objectStore(ACTIVE_DRAFT_STORE);
    const request = store.get(ACTIVE_DRAFT_KEY);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const parsed = activeDraftRecordSchema.safeParse(request.result);
      resolve(parsed.success ? parsed.data : null);
    };

    transaction.oncomplete = () => database.close();
    transaction.onerror = () => reject(transaction.error);
  });
}

async function writeActiveDraftRecord(record: ModernEditorActiveDraftRecord): Promise<void> {
  const database = await openActiveDraftDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(ACTIVE_DRAFT_STORE, 'readwrite');
    const store = transaction.objectStore(ACTIVE_DRAFT_STORE);
    const request = store.put(record);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();

    transaction.oncomplete = () => database.close();
    transaction.onerror = () => reject(transaction.error);
  });
}

async function deleteActiveDraftRecord(): Promise<void> {
  const database = await openActiveDraftDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(ACTIVE_DRAFT_STORE, 'readwrite');
    const store = transaction.objectStore(ACTIVE_DRAFT_STORE);
    const request = store.delete(ACTIVE_DRAFT_KEY);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();

    transaction.oncomplete = () => database.close();
    transaction.onerror = () => reject(transaction.error);
  });
}

export function createSerializableModernEditorAssets(
  assets: readonly EditorAsset[],
): SerializableEditorAsset[] {
  return assets.map(({ file: _file, ...asset }) => asset);
}

export function createModernEditorStoredAssetFiles(
  assets: readonly EditorAsset[],
): ModernEditorStoredAssetFile[] {
  return assets
    .filter((asset): asset is EditorAsset & { file: File } => isBrowserFile(asset.file))
    .map((asset) => ({
      assetId: asset.id,
      file: asset.file,
    }));
}

export function restoreModernEditorDraftAssets(
  assets: readonly SerializableEditorAsset[],
  assetFiles: readonly ModernEditorStoredAssetFile[],
): EditorAsset[] {
  const fileByAssetId = new Map(assetFiles.map((item) => [item.assetId, item.file]));

  return assets.map((asset) => {
    const file = fileByAssetId.get(asset.id);
    if (!file) {
      return { ...asset };
    }

    return {
      ...asset,
      file,
      url: URL.createObjectURL(file),
    };
  });
}

export function getModernEditorDrafts(): ModernEditorDraft[] {
  return readDrafts();
}

export function loadLatestModernEditorDraft(): ModernEditorDraft | null {
  return readDrafts()[0] ?? null;
}

export function saveModernEditorDraft(
  project: ModernProject,
  assets: readonly EditorAsset[],
): ModernEditorDraft {
  const serializableAssets = createSerializableModernEditorAssets(assets);
  const draft: ModernEditorDraft = {
    id: project.id,
    title: project.title,
    savedAt: new Date().toISOString(),
    project,
    assets: serializableAssets,
  };
  const existingDrafts = readDrafts().filter((item) => item.id !== draft.id);
  writeDrafts([draft, ...existingDrafts].slice(0, MAX_DRAFTS));

  return draft;
}

export async function saveActiveModernEditorDraft(
  project: ModernProject,
  assets: readonly EditorAsset[],
): Promise<ModernEditorDraft> {
  const savedAt = new Date().toISOString();
  const draft: ModernEditorDraft = {
    id: project.id,
    title: project.title,
    savedAt,
    project,
    assets: createSerializableModernEditorAssets(assets),
  };

  await writeActiveDraftRecord({
    ...draft,
    key: ACTIVE_DRAFT_KEY,
    assetFiles: createModernEditorStoredAssetFiles(assets),
  });

  return draft;
}

export async function loadActiveModernEditorDraft(): Promise<ModernEditorRestoredDraft | null> {
  const record = await readActiveDraftRecord();
  if (!record) {
    return null;
  }

  return {
    id: record.id,
    title: record.title,
    savedAt: record.savedAt,
    project: record.project,
    assets: restoreModernEditorDraftAssets(record.assets, record.assetFiles),
  };
}

export async function clearActiveModernEditorDraft(): Promise<void> {
  await deleteActiveDraftRecord();
}
