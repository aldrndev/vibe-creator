interface CreateImageClipInput {
  inputPath: string;
  outputPath: string;
  durationSec: number;
  width: number;
  height: number;
  fps: number;
}

export async function createImageClip({
  inputPath,
  outputPath,
  durationSec,
  width,
  height,
  fps,
}: CreateImageClipInput): Promise<void> {
  const { runFFmpeg, validateInputPath, validateOutputPath } = await import('../ffmpeg/index');

  const validInput = validateInputPath(inputPath);
  const validOutput = validateOutputPath(outputPath);
  const filter = [
    `scale=${width}:${height}:force_original_aspect_ratio=decrease`,
    `pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2`,
    'format=yuv420p',
  ].join(',');

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
  });
}
