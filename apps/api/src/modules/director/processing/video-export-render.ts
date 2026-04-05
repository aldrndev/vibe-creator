interface ExportClipRange {
  sourcePath: string;
  start: number;
  end: number;
}

export interface RenderProfile {
  width: number;
  heightPortrait: number;
  widthLandscape: number;
  heightLandscape: number;
  square: number;
  crf: string;
  preset: string;
}

export function getRenderProfile(quality: '720p' | '1080p' = '1080p'): RenderProfile {
  if (quality === '720p') {
    return {
      width: 720,
      heightPortrait: 1280,
      widthLandscape: 1280,
      heightLandscape: 720,
      square: 720,
      crf: '20',
      preset: 'medium',
    };
  }

  return {
    width: 1080,
    heightPortrait: 1920,
    widthLandscape: 1920,
    heightLandscape: 1080,
    square: 1080,
    crf: '18',
    preset: 'medium',
  };
}

export function buildClipProcessingArgs(
  clip: ExportClipRange,
  clipOutPath: string,
  vfFilters: string[],
  quality: '720p' | '1080p' = '1080p',
  normalizeAudio = true,
): string[] {
  const duration = clip.end - clip.start;
  const renderProfile = getRenderProfile(quality);
  const args = [
    '-y',
    '-ss',
    clip.start.toFixed(3),
    '-i',
    clip.sourcePath,
    '-t',
    duration.toFixed(3),
  ];

  if (vfFilters.length > 0) {
    args.push('-vf', vfFilters.join(','));
  }

  if (normalizeAudio) {
    args.push('-af', 'loudnorm=I=-16:TP=-1.5:LRA=11');
  }

  args.push(
    '-c:v',
    'libx264',
    '-preset',
    renderProfile.preset,
    '-crf',
    renderProfile.crf,
    '-pix_fmt',
    'yuv420p',
    '-movflags',
    '+faststart',
    '-c:a',
    'aac',
    '-b:a',
    quality === '720p' ? '128k' : '192k',
    clipOutPath,
  );

  return args;
}

export function buildTrackedClipProcessingArgs(
  videoPath: string,
  audioSourcePath: string,
  clipOutPath: string,
  vfFilters: string[],
  quality: '720p' | '1080p' = '1080p',
  normalizeAudio = true,
): string[] {
  const renderProfile = getRenderProfile(quality);
  const args = ['-y', '-i', videoPath, '-i', audioSourcePath];

  if (vfFilters.length > 0) {
    args.push('-vf', vfFilters.join(','));
  }

  args.push('-map', '0:v:0', '-map', '1:a:0?', '-shortest');

  if (normalizeAudio) {
    args.push('-af', 'loudnorm=I=-16:TP=-1.5:LRA=11');
  }

  args.push(
    '-c:v',
    'libx264',
    '-preset',
    renderProfile.preset,
    '-crf',
    renderProfile.crf,
    '-pix_fmt',
    'yuv420p',
    '-movflags',
    '+faststart',
    '-c:a',
    'aac',
    '-b:a',
    quality === '720p' ? '128k' : '192k',
    clipOutPath,
  );

  return args;
}

export function shouldUseFaceTracking(
  faceTracking: boolean | undefined,
  aspectRatio?: '9:16' | '16:9' | '1:1',
): boolean {
  return aspectRatio === '9:16' && Boolean(faceTracking);
}

export function getAspectRatioFilter(
  aspectRatio: '9:16' | '16:9' | '1:1' = '9:16',
  quality: '720p' | '1080p' = '1080p',
  faceTracking = false,
): string {
  const profile = getRenderProfile(quality);

  switch (aspectRatio) {
    case '16:9':
      return `scale=${profile.widthLandscape}:${profile.heightLandscape}:force_original_aspect_ratio=decrease,pad=${profile.widthLandscape}:${profile.heightLandscape}:(ow-iw)/2:(oh-ih)/2:color=black`;
    case '1:1':
      return `scale=${profile.square}:${profile.square}:force_original_aspect_ratio=decrease,pad=${profile.square}:${profile.square}:(ow-iw)/2:(oh-ih)/2:color=black`;
    default:
      if (faceTracking) {
        return `scale=${profile.width}:${profile.heightPortrait}:force_original_aspect_ratio=increase,crop=${profile.width}:${profile.heightPortrait}`;
      }
      return `scale=${profile.width}:${profile.heightPortrait}:force_original_aspect_ratio=decrease,pad=${profile.width}:${profile.heightPortrait}:(ow-iw)/2:(oh-ih)/2:color=black`;
  }
}
