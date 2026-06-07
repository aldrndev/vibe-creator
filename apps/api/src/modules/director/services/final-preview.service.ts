import { access, mkdir, rename, unlink } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { env } from '@/config/env';
import { assertWorkspaceActive } from '@/modules/workspace/workspace-lifecycle';
import { directorProcessor } from '../director.processor';
import { directorRepo } from '../director.repo';
import {
  buildExportClipFromSelectedClip,
  type ExportClipSegment,
  type ExportClipSettingsInput,
} from '../export-clip-builder';
import { buildLivePreviewCacheFileName } from '../live-preview-cache';
import { runWithPreviewGenerationLock } from '../preview-generation-lock';
import type { SubtitleStyleOptions } from '../processing/video-export-subtitles';
import type { ExportOptionsInput } from './export.service';

export type FinalPreviewOptionsInput = ExportOptionsInput & {
  subtitleStyle?: SubtitleStyleOptions;
};

/**
 * File target metadata for a cached or queued AI Director final preview.
 */
export interface FinalPreviewRenderTarget {
  previewFileName: string;
  previewFilePath: string;
  previewStorageKey: string;
  cached: boolean;
}

interface FinalPreviewRenderInput extends FinalPreviewRenderTarget {
  outputDir: string;
  builtClip: ReturnType<typeof buildExportClipFromSelectedClip>;
  normalizedOptions: {
    includeSubtitles: boolean;
    normalizeAudio: boolean;
    aspectRatio: '9:16' | '16:9' | '1:1';
    quality: '720p' | '1080p';
    subtitleStyle?: SubtitleStyleOptions;
  };
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function buildTranscriptSegments(segments: unknown): ExportClipSegment[] | undefined {
  if (!Array.isArray(segments)) {
    return undefined;
  }

  return segments
    .filter(
      (segment): segment is ExportClipSegment =>
        typeof segment === 'object' &&
        segment !== null &&
        'startMs' in segment &&
        'endMs' in segment &&
        'text' in segment &&
        typeof segment.startMs === 'number' &&
        typeof segment.endMs === 'number' &&
        typeof segment.text === 'string',
    )
    .map((segment) => ({
      startMs: segment.startMs,
      endMs: segment.endMs,
      text: segment.text,
      ...(segment.speaker ? { speaker: segment.speaker } : {}),
      ...(segment.words?.length ? { words: segment.words } : {}),
    }));
}

async function resolveFinalPreviewRenderInput(
  sessionId: string,
  userId: string,
  options: FinalPreviewOptionsInput,
): Promise<FinalPreviewRenderInput> {
  const session = await directorRepo.findSession(sessionId, userId);
  if (!session) {
    throw new Error('Session not found');
  }
  assertWorkspaceActive(session.lifecycleStatus, session.expiresAt);

  if (session.selectedClips.length === 0) {
    throw new Error('Tidak ada klip terpilih');
  }

  if (session.selectedClips.length !== 1) {
    throw new Error('Preview final hanya mendukung 1 klip untuk 1 short');
  }

  const asset = session.asset;
  if (!asset) {
    throw new Error('Session asset not found');
  }

  const sourceFileName = basename(asset.storageKey);
  const sourcePath = join(env.MEDIA_INPUT_DIR, 'director', sourceFileName);
  if (!(await fileExists(sourcePath))) {
    throw new Error('Asset file missing');
  }

  const selectedClip = session.selectedClips[0];
  if (!selectedClip) {
    throw new Error('Selected clip not found');
  }

  const transcriptSegments = buildTranscriptSegments(selectedClip.transcript?.segments);
  const clipSettings = options.refineSettings?.[selectedClip.id] as
    | ExportClipSettingsInput
    | undefined;
  const builtClip = buildExportClipFromSelectedClip({
    clip: {
      id: selectedClip.id,
      trimStartMs: selectedClip.trimStartMs,
      trimEndMs: selectedClip.trimEndMs,
      candidate: {
        startMs: selectedClip.candidate.startMs,
        endMs: selectedClip.candidate.endMs,
        metadata: selectedClip.candidate.metadata,
      },
      transcript: transcriptSegments ? { segments: transcriptSegments } : undefined,
    },
    sourcePath,
    settings: clipSettings,
  });

  const aspectRatio = (options.aspectRatio ?? '9:16') as '9:16' | '16:9' | '1:1';
  const quality = (options.quality ?? '1080p') as '720p' | '1080p';
  const subtitleStyle = options.subtitleStyle
    ? {
        ...options.subtitleStyle,
        contentMode: builtClip.resolvedContentMode,
        aspectRatio,
        quality,
      }
    : undefined;
  const normalizedOptions = {
    includeSubtitles: options.includeSubtitles ?? true,
    normalizeAudio: options.normalizeAudio ?? true,
    aspectRatio,
    quality,
    ...(subtitleStyle ? { subtitleStyle } : {}),
  };

  const outputDir = join(env.MEDIA_INPUT_DIR, 'director', 'live-previews');
  const previewFileName = buildLivePreviewCacheFileName({
    sessionId,
    sourceFileName,
    clipPayload: builtClip,
    options: normalizedOptions,
  });
  const previewFilePath = join(outputDir, previewFileName);

  return {
    outputDir,
    builtClip,
    normalizedOptions,
    previewFileName,
    previewFilePath,
    previewStorageKey: `director/live-previews/${previewFileName}`,
    cached: await fileExists(previewFilePath),
  };
}

export const directorFinalPreviewService = {
  async resolveFinalPreviewTarget(
    sessionId: string,
    userId: string,
    options: FinalPreviewOptionsInput,
  ): Promise<FinalPreviewRenderTarget> {
    const input = await resolveFinalPreviewRenderInput(sessionId, userId, options);
    return {
      previewFileName: input.previewFileName,
      previewFilePath: input.previewFilePath,
      previewStorageKey: input.previewStorageKey,
      cached: input.cached,
    };
  },

  async renderFinalPreview(
    sessionId: string,
    userId: string,
    previewFileName: string,
    options: FinalPreviewOptionsInput,
  ): Promise<FinalPreviewRenderTarget> {
    const input = await resolveFinalPreviewRenderInput(sessionId, userId, options);

    if (input.previewFileName !== previewFileName) {
      throw new Error('Preview fingerprint mismatch');
    }

    if (input.cached) {
      return input;
    }

    await mkdir(input.outputDir, { recursive: true });

    await runWithPreviewGenerationLock(input.previewFilePath, async () => {
      if (await fileExists(input.previewFilePath)) {
        return;
      }

      const generatedFile = await directorProcessor.exportVideo(
        [input.builtClip],
        input.outputDir,
        {
          ...input.normalizedOptions,
        },
      );
      const generatedPath = join(input.outputDir, generatedFile);

      try {
        await rename(generatedPath, input.previewFilePath);
      } catch (error) {
        if (await fileExists(input.previewFilePath)) {
          await unlink(generatedPath).catch(() => {});
          return;
        }
        throw error;
      }
    });

    return {
      ...input,
      cached: true,
    };
  },
};
