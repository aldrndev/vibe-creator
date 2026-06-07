import { logger } from '@/lib/logger';

async function attemptCdnDownload(
  url: string,
  outputPath: string,
  userAgent: string,
): Promise<boolean> {
  const response = await fetch(url, {
    method: 'GET',
    headers: { 'User-Agent': userAgent },
    signal: AbortSignal.timeout(120000), // 2 minutes timeout
  });

  if (!response.ok) return false;

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('video/mp4') && !contentType.includes('application/octet-stream')) {
    return false;
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  if (buffer.length <= 1024) return false;

  const { writeFile } = await import('node:fs/promises');
  await writeFile(outputPath, buffer);

  return true;
}

export const downloadSoraService = {
  /**
   * Download Sora video using SoraPure's multi-CDN fallback approach
   * Based on: https://github.com/bakhtiersizhaev/sorapure
   */
  async downloadSoraVideo(
    url: string,
    outputPath: string,
  ): Promise<{ title: string; metadata: Record<string, unknown> }> {
    // Extract video ID from URL (s_xxxxx format)
    const videoIdMatch = url.match(/(s_[0-9A-Za-z_-]{8,})/);
    const videoId = videoIdMatch?.[1];

    if (!videoId) {
      throw new Error('SORA_INVALID_URL: Cannot extract video ID (expected s_xxxxx format)');
    }

    logger.info({ videoId }, 'Downloading Sora video via multi-CDN fallback');

    // CDN endpoints (decoded from sorapure)
    const CDN_ENDPOINTS = {
      CDN_DIRECT: `https://oscdn2.dyysy.com/MP4/${videoId}.mp4`,
      CDN_PROXY: `https://api.soracdn.workers.dev/download-proxy?id=${videoId}`,
      OPENAI_CDN: `https://cdn.openai.com/MP4/${videoId}.mp4`,
    };

    const USER_AGENT =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36';

    // Try each CDN in order
    const cdnAttempts = [
      { name: 'CDN_DIRECT', url: CDN_ENDPOINTS.CDN_DIRECT },
      { name: 'CDN_PROXY', url: CDN_ENDPOINTS.CDN_PROXY },
      { name: 'OPENAI_CDN', url: CDN_ENDPOINTS.OPENAI_CDN },
    ];

    let sourceUsed = '';

    for (const cdn of cdnAttempts) {
      logger.info({ source: cdn.name, videoId }, `Attempting ${cdn.name}...`);

      try {
        const success = await attemptCdnDownload(cdn.url, outputPath, USER_AGENT);
        if (success) {
          sourceUsed = cdn.name;
          logger.info({ source: cdn.name }, 'Sora download success');
          break;
        }
      } catch (err) {
        logger.warn({ source: cdn.name, err }, `Failed to download from ${cdn.name}`);
      }
    }

    if (!sourceUsed) {
      throw new Error('SORA_DOWNLOAD_FAILED: All CDNs failed or returned invalid content');
    }

    return {
      title: `Sora Generation ${videoId}`,
      metadata: { source: 'sora', cdn: sourceUsed, videoId },
    };
  },
};
