import type { ModernProject } from '@vibe-creator/shared';
import type {
  ModernEditorRestoredDraft,
  SerializableModernEditorAsset,
} from '@/lib/modern-editor-drafts';
import type { VideoStudioProjectSession } from '@/services/video-studio-project-api';
import type { EditorAsset } from '@/stores/editor-store';

/** Project and assets selected after comparing backend session and local draft freshness. */
export interface HydratedModernEditorProject {
  readonly project: ModernProject;
  readonly assets: EditorAsset[];
}

function getSavedAtTime(savedAt: string): number {
  const time = new Date(savedAt).getTime();
  return Number.isFinite(time) ? time : 0;
}

function restoreSessionAssetsWithLocalFiles(
  assets: readonly SerializableModernEditorAsset[],
  localAssets: readonly EditorAsset[],
): EditorAsset[] {
  const localAssetById = new Map(localAssets.map((asset) => [asset.id, asset]));

  return assets.map((asset) => {
    const localAsset = localAssetById.get(asset.id);
    if (!localAsset?.file) {
      return { ...asset };
    }

    return {
      ...asset,
      file: localAsset.file,
      url: localAsset.url,
    };
  });
}

/** Chooses the newest Video Studio state while preserving browser file handles when available. */
export function resolveHydratedModernEditorProject(
  session: VideoStudioProjectSession,
  localDraft: ModernEditorRestoredDraft | null,
): HydratedModernEditorProject {
  if (localDraft?.project.id !== session.project.id) {
    return {
      project: session.project,
      assets: session.assets.map((asset) => ({ ...asset })),
    };
  }

  if (getSavedAtTime(localDraft.savedAt) >= getSavedAtTime(session.savedAt)) {
    return {
      project: localDraft.project,
      assets: localDraft.assets,
    };
  }

  return {
    project: session.project,
    assets: restoreSessionAssetsWithLocalFiles(session.assets, localDraft.assets),
  };
}
