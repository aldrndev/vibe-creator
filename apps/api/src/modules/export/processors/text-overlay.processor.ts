import { join } from 'node:path';
import { env } from '@/config/env';
import { resolveEditorFontFile } from '@/lib/editor-fonts';
import { logger } from '@/lib/logger';
import type { TimelineData } from './export-processor.types';
import { buildDrawtextFilter } from './text-overlay-filter';

const TEMP_DIR = join(env.MEDIA_INPUT_DIR, 'temp');

interface ApplyTextOverlaysInput {
  readonly inputPath: string;
  readonly textOverlays: TimelineData['textOverlays'];
  readonly outputId: string;
  readonly tempFiles: string[];
  readonly onProgress?: (percent: number) => void;
}

/**
 * Render text overlays onto an exported video using FFmpeg drawtext.
 */
export async function applyTextOverlays({
  inputPath,
  textOverlays,
  outputId,
  tempFiles,
  onProgress,
}: ApplyTextOverlaysInput): Promise<string> {
  if (!textOverlays || textOverlays.length === 0) return inputPath;

  const drawtextFilters: string[] = [];

  for (const overlay of textOverlays.filter((item) => item.visible !== false)) {
    const fontFile = resolveEditorFontFile(overlay.fontFamily, overlay.fontWeight === 'bold');
    if (!fontFile) {
      logger.warn(
        { fontFamily: overlay.fontFamily },
        'Editor font file missing; FFmpeg will use its default font',
      );
    }
    if (overlay.fontStyle === 'italic') {
      logger.warn(
        { fontFamily: overlay.fontFamily },
        'Italic editor font variant is not available yet; FFmpeg will use regular font file',
      );
    }

    drawtextFilters.push(buildDrawtextFilter(overlay, fontFile));
  }

  if (drawtextFilters.length === 0) return inputPath;

  const textOverlayPath = join(TEMP_DIR, `${outputId}_text.mp4`);
  const filterChain = drawtextFilters.join(',');

  const { runFFmpeg, validateInputPath, validateOutputPath } = await import('../ffmpeg/index');

  const validInput = validateInputPath(inputPath);
  const validOutput = validateOutputPath(textOverlayPath);

  await runFFmpeg({
    args: [
      '-nostdin',
      '-hide_banner',
      '-loglevel',
      'error',
      '-progress',
      'pipe:1',
      '-i',
      validInput,
      '-vf',
      filterChain,
      '-c:v',
      'libx264',
      '-c:a',
      'copy',
      '-preset',
      'fast',
      validOutput,
    ],
    tempDir: '',
    totalDurationMs: 120000,
    timeoutMs: 180000,
    onProgress: (update) => {
      if (update.type === 'PROGRESS' && update.percent !== undefined) {
        onProgress?.(update.percent);
      }
    },
  });

  tempFiles.push(textOverlayPath);
  return textOverlayPath;
}
