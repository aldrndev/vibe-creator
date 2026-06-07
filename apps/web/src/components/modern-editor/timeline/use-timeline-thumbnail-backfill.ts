import { useEffect, useRef } from 'react';
import { generateEditorAssetThumbnailSet } from '@/lib/modern-media-thumbnails';
import type { EditorAsset } from '@/stores/editor-store';
import { useModernEditorStore } from '@/stores/modern-editor-store';

/**
 * Backfills timeline filmstrip thumbnails for uploaded videos without blocking import.
 */
export function useTimelineThumbnailBackfill(assets: readonly EditorAsset[]) {
  const attemptedAssetIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const assetsNeedingThumbnails = assets.filter((asset) => {
      const timelineThumbnailCount = asset.thumbnails?.length ?? 0;
      return (
        asset.type === 'VIDEO' &&
        asset.url.length > 0 &&
        timelineThumbnailCount <= 1 &&
        !attemptedAssetIdsRef.current.has(asset.id)
      );
    });

    if (assetsNeedingThumbnails.length === 0) {
      return;
    }

    let cancelled = false;
    for (const asset of assetsNeedingThumbnails) {
      attemptedAssetIdsRef.current.add(asset.id);
    }

    const backfillTimelineThumbnails = async () => {
      for (const asset of assetsNeedingThumbnails) {
        const thumbnailSet = await generateEditorAssetThumbnailSet(asset.type, asset.url);
        if (cancelled || thumbnailSet.thumbnails.length <= 1) {
          continue;
        }

        const store = useModernEditorStore.getState();
        store.replaceAssets(
          store.assets.map((currentAsset) =>
            currentAsset.id === asset.id
              ? {
                  ...currentAsset,
                  thumbnailUrl: currentAsset.thumbnailUrl ?? thumbnailSet.thumbnailUrl ?? undefined,
                  thumbnails: thumbnailSet.thumbnails,
                }
              : currentAsset,
          ),
        );
      }
    };

    void backfillTimelineThumbnails();

    return () => {
      cancelled = true;
    };
  }, [assets]);
}
