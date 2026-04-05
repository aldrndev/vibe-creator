import { createHash } from 'node:crypto';

const CLIP_MEDIA_CACHE_VERSION = 'v5';

interface ClipMediaCacheInput {
  readonly assetId: string;
  readonly candidateId: string;
  readonly startMs: number;
  readonly endMs: number;
  readonly sourceFileName: string;
}

function getClipMediaCacheKey({
  assetId,
  candidateId,
  startMs,
  endMs,
  sourceFileName,
}: ClipMediaCacheInput): string {
  return createHash('sha1')
    .update(
      `${CLIP_MEDIA_CACHE_VERSION}:${assetId}:${candidateId}:${startMs}:${endMs}:${sourceFileName}`,
    )
    .digest('hex');
}

/**
 * Deterministic cache filename for a generated clip video.
 */
export function getClipPreviewCacheFileName(input: ClipMediaCacheInput): string {
  return `clip-preview-${getClipMediaCacheKey(input)}.mp4`;
}

/**
 * Deterministic cache filename for a generated clip poster image.
 */
export function getClipPosterCacheFileName(input: ClipMediaCacheInput): string {
  return `poster-${getClipMediaCacheKey(input)}.jpg`;
}
