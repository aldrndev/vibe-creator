/**
 * RTMP Streaming Utilities
 * Platform configuration and URL building
 */

export type StreamPlatform = 'youtube' | 'tiktok' | 'twitch' | 'facebook' | 'instagram' | 'custom';

export interface StreamConfig {
  platform: StreamPlatform;
  rtmpUrl: string;
  streamKey: string;
  quality: '720p' | '1080p';
  bitrateKbps?: number;
  durationMinutes?: number;
}

/**
 * Quality settings for streaming
 */
export const QualitySettings = {
  '720p': { w: -2, h: 720, minK: 1500, maxK: 4500, defK: 2500, bufK: 5000 },
  '1080p': { w: -2, h: 1080, minK: 3000, maxK: 8000, defK: 4500, bufK: 9000 },
};

/**
 * RTMP server URLs for each platform
 */
const RTMP_SERVERS: Record<StreamPlatform, string> = {
  youtube: 'rtmp://a.rtmp.youtube.com/live2',
  tiktok: 'rtmp://push.tiktokv.us/live',
  twitch: 'rtmp://live.twitch.tv/app',
  facebook: 'rtmps://live-api-s.facebook.com:443/rtmp',
  instagram: 'rtmps://live-upload.instagram.com:443/rtmp',
  custom: '',
};

/**
 * Get RTMP ingest URL for platform
 */
export function getRtmpUrl(
  platform: StreamPlatform,
  streamKey: string,
  customUrl?: string,
): string {
  const baseUrl = platform === 'custom' ? customUrl || '' : RTMP_SERVERS[platform];
  return `${baseUrl}/${streamKey}`;
}

/**
 * Build FFmpeg args for streaming
 */
export function buildStreamArgs(
  inputPath: string,
  config: StreamConfig,
  rtmpUrl: string,
): string[] {
  const settings = QualitySettings[config.quality || '720p'];

  // Clamp bitrate
  let videoBitrate = config.bitrateKbps || settings.defK;
  if (videoBitrate < settings.minK) videoBitrate = settings.minK;
  if (videoBitrate > settings.maxK) videoBitrate = settings.maxK;

  const maxRate = Math.round(videoBitrate * 1.5);
  const bufSize = Math.round(videoBitrate * 2);

  return [
    '-re',
    '-stream_loop',
    '-1',
    '-i',
    inputPath,
    '-vf',
    `scale=${settings.w}:${settings.h}`,
    '-c:v',
    'libx264',
    '-preset',
    'veryfast',
    '-b:v',
    `${videoBitrate}k`,
    '-maxrate',
    `${maxRate}k`,
    '-bufsize',
    `${bufSize}k`,
    '-pix_fmt',
    'yuv420p',
    '-g',
    '60',
    '-keyint_min',
    '60',
    '-sc_threshold',
    '0',
    '-c:a',
    'aac',
    '-b:a',
    '128k',
    '-ar',
    '44100',
    '-ac',
    '2',
    '-f',
    'flv',
    rtmpUrl,
  ];
}
