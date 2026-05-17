import { useQuery } from '@tanstack/react-query';
import type {
  VideoStudioTextAction,
  VideoStudioTextActionId,
} from '@/lib/modern-editor-quick-actions';
import {
  isVideoStudioTextActionId,
  videoStudioElementActionIds,
  videoStudioTextActions,
} from '@/lib/modern-editor-quick-actions';
import {
  listAllVideoStudioAssets,
  type VideoStudioAsset,
  type VideoStudioTextPayload,
} from '@/services/video-studio-assets-api';

const ASSET_LIBRARY_STALE_TIME_MS = 5 * 60 * 1000;
const elementActionIdSet = new Set<string>(videoStudioElementActionIds);

interface VideoStudioAssetLibrary {
  readonly audioAssets: VideoStudioAsset[];
  readonly elementActions: VideoStudioTextAction[];
  readonly isFallback: boolean;
  readonly isLoading: boolean;
  readonly textActions: VideoStudioTextAction[];
}

function toTextAction(asset: VideoStudioAsset): VideoStudioTextAction | null {
  if (asset.kind !== 'text' && asset.kind !== 'element') {
    return null;
  }

  if (asset.payload.kind !== 'text-layer' && asset.payload.kind !== 'element-layer') {
    return null;
  }

  if (!isVideoStudioTextActionId(asset.id)) {
    return null;
  }

  const payload: VideoStudioTextPayload = asset.payload;
  return {
    id: asset.id as VideoStudioTextActionId,
    label: asset.title,
    description: asset.description,
    text: payload.text,
    durationMs: payload.durationMs,
    x: payload.x,
    y: payload.y,
    width: payload.width,
    height: payload.height,
    data: payload.data,
    preview: payload.preview,
  };
}

function getFallbackLibrary(): Omit<VideoStudioAssetLibrary, 'isLoading'> {
  return {
    audioAssets: [],
    elementActions: videoStudioTextActions.filter((action) => elementActionIdSet.has(action.id)),
    isFallback: true,
    textActions: videoStudioTextActions.filter((action) => !elementActionIdSet.has(action.id)),
  };
}

function mergeActionsWithFallback(
  apiActions: readonly VideoStudioTextAction[],
  fallbackActions: readonly VideoStudioTextAction[],
): VideoStudioTextAction[] {
  const actionIds = new Set(apiActions.map((action) => action.id));
  return [...apiActions, ...fallbackActions.filter((action) => !actionIds.has(action.id))];
}

function isTextAction(action: VideoStudioTextAction | null): action is VideoStudioTextAction {
  return action !== null;
}

/**
 * Loads the backend-driven Video Studio sidebar catalog with static fallback.
 */
export function useVideoStudioAssets(): VideoStudioAssetLibrary {
  const query = useQuery({
    queryKey: ['video-studio-assets', 'all'],
    queryFn: () => listAllVideoStudioAssets({ limit: 50 }),
    staleTime: ASSET_LIBRARY_STALE_TIME_MS,
    retry: 1,
  });

  if (!query.data || query.isError) {
    return {
      ...getFallbackLibrary(),
      isLoading: query.isLoading,
    };
  }

  const actions = query.data.items.map(toTextAction).filter(isTextAction);
  const apiTextActions = actions.filter((action) =>
    query.data.items.some((asset) => asset.id === action.id && asset.kind === 'text'),
  );
  const apiElementActions = actions.filter((action) =>
    query.data.items.some((asset) => asset.id === action.id && asset.kind === 'element'),
  );
  const fallbackLibrary = getFallbackLibrary();

  return {
    audioAssets: query.data.items.filter((asset) => asset.kind === 'audio'),
    elementActions: mergeActionsWithFallback(apiElementActions, fallbackLibrary.elementActions),
    isFallback: false,
    isLoading: query.isLoading,
    textActions: mergeActionsWithFallback(apiTextActions, fallbackLibrary.textActions),
  };
}
