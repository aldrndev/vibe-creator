import { createHash } from 'node:crypto';
import type { SubtitleStyleOptions } from './processing/video-export-subtitles';

interface LivePreviewCacheInput {
  sessionId: string;
  sourceFileName: string;
  clipPayload: unknown;
  options: {
    includeSubtitles: boolean;
    normalizeAudio: boolean;
    aspectRatio: '9:16' | '16:9' | '1:1';
    quality: '720p' | '1080p';
    subtitleStyle?: SubtitleStyleOptions;
  };
}

/**
 * Build deterministic preview filename so identical settings reuse the same rendered file.
 */
export function buildLivePreviewCacheFileName(input: LivePreviewCacheInput): string {
  const fingerprint = createHash('sha1')
    .update(
      JSON.stringify({
        sessionId: input.sessionId,
        sourceFileName: input.sourceFileName,
        clip: input.clipPayload,
        options: input.options,
      }),
    )
    .digest('hex');

  return `live-preview-${fingerprint}.mp4`;
}
