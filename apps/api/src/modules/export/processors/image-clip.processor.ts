interface CreateImageClipInput {
  inputPath: string;
  outputPath: string;
  durationSec: number;
  width: number;
  height: number;
  fps: number;
  backgroundColor?: string;
  backgroundMode?: 'solid' | 'blur';
  backgroundBlurAmount?: number;
  backgroundBlurZoom?: number;
  backgroundDim?: number;
  backgroundSaturation?: number;
  onProgress?: (percent: number) => void;
}

function normalizePadColor(color: string | undefined): string {
  const match = color?.match(/^#([0-9a-fA-F]{6})(?:[0-9a-fA-F]{2})?$/);
  return match ? `0x${match[1]}` : 'black';
}

function buildImageCanvasFilter(
  width: number,
  height: number,
  backgroundMode: 'solid' | 'blur',
  backgroundColor: string | undefined,
  blurSettings: {
    blurAmount?: number;
    blurZoom?: number;
    dim?: number;
    saturation?: number;
  } = {},
): string {
  if (backgroundMode === 'blur') {
    const blurAmount = Math.max(0, Math.min(50, blurSettings.blurAmount ?? 18));
    const blurZoom = Math.max(1, Math.min(1.5, blurSettings.blurZoom ?? 1.08));
    const dim = Math.max(0, Math.min(0.6, blurSettings.dim ?? 0.08));
    const saturation = Math.max(0, Math.min(2, blurSettings.saturation ?? 1.05));
    return [
      'split=2[bgsrc][fgsrc]',
      `[bgsrc]scale=${Math.ceil(width * blurZoom)}:${Math.ceil(
        height * blurZoom,
      )}:force_original_aspect_ratio=increase,crop=${width}:${height},gblur=sigma=${blurAmount},eq=brightness=${-dim}:saturation=${saturation}[bg]`,
      `[fgsrc]scale=${width}:${height}:force_original_aspect_ratio=decrease[fg]`,
      '[bg][fg]overlay=(W-w)/2:(H-h)/2,format=yuv420p',
    ].join(';');
  }

  return [
    `scale=${width}:${height}:force_original_aspect_ratio=decrease`,
    `pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:color=${normalizePadColor(backgroundColor)}`,
    'format=yuv420p',
  ].join(',');
}

export async function createImageClip({
  backgroundColor,
  backgroundBlurAmount,
  backgroundBlurZoom,
  backgroundDim,
  backgroundSaturation,
  backgroundMode = 'solid',
  inputPath,
  onProgress,
  outputPath,
  durationSec,
  width,
  height,
  fps,
}: CreateImageClipInput): Promise<void> {
  const { runFFmpeg, validateInputPath, validateOutputPath } = await import('../ffmpeg/index');

  const validInput = validateInputPath(inputPath);
  const validOutput = validateOutputPath(outputPath);
  const filter = buildImageCanvasFilter(width, height, backgroundMode, backgroundColor, {
    blurAmount: backgroundBlurAmount,
    blurZoom: backgroundBlurZoom,
    dim: backgroundDim,
    saturation: backgroundSaturation,
  });

  await runFFmpeg({
    args: [
      '-nostdin',
      '-hide_banner',
      '-loglevel',
      'error',
      '-progress',
      'pipe:1',
      '-loop',
      '1',
      '-i',
      validInput,
      '-f',
      'lavfi',
      '-t',
      durationSec.toFixed(3),
      '-i',
      'anullsrc=channel_layout=stereo:sample_rate=44100',
      '-t',
      durationSec.toFixed(3),
      '-vf',
      filter,
      '-r',
      fps.toString(),
      '-map',
      '0:v:0',
      '-map',
      '1:a:0',
      '-c:v',
      'libx264',
      '-preset',
      'fast',
      '-crf',
      '23',
      '-pix_fmt',
      'yuv420p',
      '-c:a',
      'aac',
      '-b:a',
      '128k',
      '-shortest',
      validOutput,
    ],
    tempDir: '',
    totalDurationMs: Math.round(durationSec * 1000),
    timeoutMs: 120000,
    onProgress: (update) => {
      if (update.type === 'PROGRESS' && update.percent !== undefined) {
        onProgress?.(update.percent);
      }
    },
  });
}
