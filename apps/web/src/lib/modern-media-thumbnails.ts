import type { EditorAsset } from '@/stores/editor-store';

const THUMBNAIL_MAX_WIDTH_PX = 320;
const THUMBNAIL_IMAGE_TYPE = 'image/jpeg';
const THUMBNAIL_IMAGE_QUALITY = 0.78;
const VIDEO_THUMBNAIL_DEFAULT_SEEK_SECONDS = 0.5;
const VIDEO_THUMBNAIL_SHORT_CLIP_RATIO = 0.1;
const VIDEO_TIMELINE_THUMBNAIL_MAX_FRAMES = 12;
const VIDEO_TIMELINE_THUMBNAIL_MIN_FRAMES = 4;
const VIDEO_TIMELINE_SECONDS_PER_FRAME = 3;
const VIDEO_TIMELINE_EDGE_PADDING_MAX_SECONDS = 0.5;
const VIDEO_TIMELINE_EDGE_PADDING_RATIO = 0.08;
const THUMBNAIL_LOAD_TIMEOUT_MS = 4000;
const VIDEO_SEEK_TIMEOUT_MS = 900;

export interface ThumbnailSize {
  readonly width: number;
  readonly height: number;
}

export interface ThumbnailCanvasAdapter {
  readonly createThumbnail: (
    source: object,
    size: ThumbnailSize,
    mimeType: string,
    quality: number,
  ) => string | null;
}

export interface EditorAssetThumbnailSet {
  readonly thumbnailUrl: string | null;
  readonly thumbnails: string[];
}

const browserCanvasAdapter: ThumbnailCanvasAdapter = {
  createThumbnail: (source, size, mimeType, quality) => {
    if (typeof document === 'undefined') {
      return null;
    }

    const canvas = document.createElement('canvas');
    canvas.width = size.width;
    canvas.height = size.height;

    const context = canvas.getContext('2d');
    if (!context) {
      return null;
    }

    context.drawImage(source as CanvasImageSource, 0, 0, size.width, size.height);
    return canvas.toDataURL(mimeType, quality);
  },
};

export function getEditorThumbnailSize(
  sourceWidth: number,
  sourceHeight: number,
  maxWidth = THUMBNAIL_MAX_WIDTH_PX,
): ThumbnailSize {
  if (sourceWidth <= 0 || sourceHeight <= 0 || !Number.isFinite(sourceWidth + sourceHeight)) {
    return { width: maxWidth, height: maxWidth };
  }

  const scale = Math.min(1, maxWidth / sourceWidth);

  return {
    width: Math.max(1, Math.round(sourceWidth * scale)),
    height: Math.max(1, Math.round(sourceHeight * scale)),
  };
}

export function getVideoThumbnailSeekTime(durationSeconds: number): number {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    return 0;
  }

  return Math.min(
    VIDEO_THUMBNAIL_DEFAULT_SEEK_SECONDS,
    durationSeconds * VIDEO_THUMBNAIL_SHORT_CLIP_RATIO,
  );
}

export function getVideoTimelineThumbnailCount(durationSeconds: number): number {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    return 1;
  }

  const frameCount = Math.ceil(durationSeconds / VIDEO_TIMELINE_SECONDS_PER_FRAME);
  return clampInteger(
    frameCount,
    VIDEO_TIMELINE_THUMBNAIL_MIN_FRAMES,
    VIDEO_TIMELINE_THUMBNAIL_MAX_FRAMES,
  );
}

export function getVideoTimelineThumbnailSeekTimes(
  durationSeconds: number,
  requestedCount = getVideoTimelineThumbnailCount(durationSeconds),
): number[] {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    return [0];
  }

  const count = clampInteger(requestedCount, 1, VIDEO_TIMELINE_THUMBNAIL_MAX_FRAMES);
  if (count === 1) {
    return [getVideoThumbnailSeekTime(durationSeconds)];
  }

  const edgePaddingSeconds = Math.min(
    VIDEO_TIMELINE_EDGE_PADDING_MAX_SECONDS,
    durationSeconds * VIDEO_TIMELINE_EDGE_PADDING_RATIO,
  );
  const startSeconds = Math.min(edgePaddingSeconds, durationSeconds);
  const endSeconds = Math.max(startSeconds, durationSeconds - edgePaddingSeconds);
  const intervalSeconds = (endSeconds - startSeconds) / Math.max(1, count - 1);

  return Array.from({ length: count }, (_, index) =>
    roundSeekTime(startSeconds + intervalSeconds * index),
  );
}

export function createThumbnailDataUrlFromSource({
  adapter = browserCanvasAdapter,
  maxWidth,
  source,
  sourceHeight,
  sourceWidth,
}: Readonly<{
  adapter?: ThumbnailCanvasAdapter;
  maxWidth?: number;
  source: object;
  sourceHeight: number;
  sourceWidth: number;
}>): string | null {
  try {
    return adapter.createThumbnail(
      source,
      getEditorThumbnailSize(sourceWidth, sourceHeight, maxWidth),
      THUMBNAIL_IMAGE_TYPE,
      THUMBNAIL_IMAGE_QUALITY,
    );
  } catch {
    return null;
  }
}

export async function generateEditorAssetThumbnailUrl(
  assetType: EditorAsset['type'],
  url: string,
): Promise<string | null> {
  if (assetType === 'AUDIO') {
    return null;
  }

  if (typeof document === 'undefined') {
    return null;
  }

  if (assetType === 'IMAGE') {
    return generateImageThumbnailUrl(url);
  }

  return generateVideoThumbnailUrl(url);
}

export async function generateEditorAssetThumbnailSet(
  assetType: EditorAsset['type'],
  url: string,
): Promise<EditorAssetThumbnailSet> {
  if (assetType === 'AUDIO' || typeof document === 'undefined') {
    return { thumbnailUrl: null, thumbnails: [] };
  }

  if (assetType === 'IMAGE') {
    const thumbnailUrl = await generateImageThumbnailUrl(url);
    return {
      thumbnailUrl,
      thumbnails: thumbnailUrl ? [thumbnailUrl] : [],
    };
  }

  const thumbnails = await generateVideoTimelineThumbnailUrls(url);
  return {
    thumbnailUrl: thumbnails[0] ?? null,
    thumbnails,
  };
}

function generateImageThumbnailUrl(url: string): Promise<string | null> {
  return new Promise((resolve) => {
    const image = new Image();
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const resolveOnce = (thumbnailUrl: string | null) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      image.onload = null;
      image.onerror = null;
      resolve(thumbnailUrl);
    };

    image.crossOrigin = 'anonymous';
    image.onload = () => {
      resolveOnce(
        createThumbnailDataUrlFromSource({
          source: image,
          sourceWidth: image.naturalWidth || image.width,
          sourceHeight: image.naturalHeight || image.height,
        }),
      );
    };
    image.onerror = () => resolveOnce(null);
    timeoutId = setTimeout(() => resolveOnce(null), THUMBNAIL_LOAD_TIMEOUT_MS);
    image.src = url;
  });
}

function generateVideoThumbnailUrl(url: string): Promise<string | null> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let settled = false;

    const resolveOnce = (thumbnailUrl: string | null) => {
      if (settled) {
        return;
      }

      settled = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      video.onloadeddata = null;
      video.onloadedmetadata = null;
      video.onseeked = null;
      video.onerror = null;
      resolve(thumbnailUrl);
    };

    const captureFrame = () => {
      resolveOnce(
        createThumbnailDataUrlFromSource({
          source: video,
          sourceWidth: video.videoWidth,
          sourceHeight: video.videoHeight,
        }),
      );
    };

    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.playsInline = true;
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      const seekTimeSeconds = getVideoThumbnailSeekTime(video.duration);
      if (seekTimeSeconds === 0) {
        video.onloadeddata = captureFrame;
      }

      video.currentTime = seekTimeSeconds;
    };
    video.onseeked = captureFrame;
    video.onerror = () => resolveOnce(null);
    timeoutId = setTimeout(() => resolveOnce(null), THUMBNAIL_LOAD_TIMEOUT_MS);
    video.src = url;
    video.load();
  });
}

async function generateVideoTimelineThumbnailUrls(url: string): Promise<string[]> {
  const video = document.createElement('video');

  try {
    const metadataLoaded = await loadVideoMetadata(video, url);
    if (!metadataLoaded) {
      return [];
    }

    const seekTimes = getVideoTimelineThumbnailSeekTimes(video.duration);
    const thumbnails: string[] = [];

    for (const seekTimeSeconds of seekTimes) {
      const didSeek = await seekVideoToTime(video, seekTimeSeconds);
      if (!didSeek) {
        continue;
      }

      const thumbnailUrl = createThumbnailDataUrlFromSource({
        source: video,
        sourceWidth: video.videoWidth,
        sourceHeight: video.videoHeight,
      });

      if (thumbnailUrl) {
        thumbnails.push(thumbnailUrl);
      }
    }

    return thumbnails;
  } finally {
    video.removeAttribute('src');
    video.load();
  }
}

function loadVideoMetadata(video: HTMLVideoElement, url: string): Promise<boolean> {
  return new Promise((resolve) => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const cleanup = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      video.onloadedmetadata = null;
      video.onerror = null;
    };

    const resolveOnce = (result: boolean) => {
      cleanup();
      resolve(result);
    };

    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.playsInline = true;
    video.preload = 'metadata';
    video.onloadedmetadata = () => resolveOnce(true);
    video.onerror = () => resolveOnce(false);
    timeoutId = setTimeout(() => resolveOnce(false), THUMBNAIL_LOAD_TIMEOUT_MS);
    video.src = url;
    video.load();
  });
}

function seekVideoToTime(video: HTMLVideoElement, seekTimeSeconds: number): Promise<boolean> {
  return new Promise((resolve) => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const cleanup = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      video.onseeked = null;
      video.onerror = null;
    };

    const resolveOnce = (result: boolean) => {
      cleanup();
      resolve(result);
    };

    if (Math.abs(video.currentTime - seekTimeSeconds) < 0.01 && video.readyState >= 2) {
      resolve(true);
      return;
    }

    video.onseeked = () => resolveOnce(true);
    video.onerror = () => resolveOnce(false);
    timeoutId = setTimeout(() => resolveOnce(false), VIDEO_SEEK_TIMEOUT_MS);

    try {
      video.currentTime = seekTimeSeconds;
    } catch {
      resolveOnce(false);
    }
  });
}

function clampInteger(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(max, Math.max(min, Math.round(value)));
}

function roundSeekTime(value: number): number {
  return Number(value.toFixed(3));
}
