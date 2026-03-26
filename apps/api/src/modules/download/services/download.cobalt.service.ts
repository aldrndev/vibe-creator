import { createWriteStream } from 'node:fs';
import { stat, writeFile } from 'node:fs/promises';
import { env } from '@/config/env';
import { createCircuitBreaker } from '@/lib/circuit-breaker';
import { logger } from '@/lib/logger';
import { assertSafeUrl } from '@/utils/ssrf';

interface CobaltResponse {
  status: 'error' | 'redirect' | 'tunnel' | 'picker';
  url?: string;
  urls?: string[];
  text?: string;
  picker?: Array<{ url: string; type: string }>;
}

// Circuit breaker for Cobalt API
const cobaltBreaker = createCircuitBreaker(
  async (...args: unknown[]): Promise<Response> => {
    const [url, requestBody] = args as [string, RequestInit];
    return fetch(url, requestBody);
  },
  {
    serviceName: 'Cobalt API',
    timeout: 15000,
    errorThresholdPercentage: 50,
    resetTimeout: 60000,
    allowRetry: true,
  },
);

export const downloadCobaltService = {
  /**
   * Download using Cobalt API
   */
  async runCobalt(
    url: string,
    outputPath: string,
    onProgress?: (percent: number) => void,
  ): Promise<{ title: string; metadata: Record<string, unknown> }> {
    await assertSafeUrl(url);

    if (!env.COBALT_API_URL) {
      throw new Error('Cobalt API URL not configured');
    }

    logger.info({ cobaltUrl: env.COBALT_API_URL, videoUrl: url }, 'Calling Cobalt API');

    const response = await cobaltBreaker.fire(env.COBALT_API_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        videoQuality: '1080',
        youtubeVideoCodec: 'h264',
        filenameStyle: 'basic',
        downloadMode: 'auto',
      }),
    });

    // Get response as text first to debug
    const responseText = await response.text();
    logger.info(
      { status: response.status, responseLength: responseText.length },
      'Cobalt API response',
    );

    if (!response.ok) {
      throw new Error(`Cobalt API error: ${response.status} - ${responseText.slice(0, 200)}`);
    }

    if (!responseText) {
      throw new Error('Cobalt API returned empty response');
    }

    let data: CobaltResponse;
    try {
      data = JSON.parse(responseText) as CobaltResponse;
    } catch {
      throw new Error(`Cobalt API returned invalid JSON: ${responseText.slice(0, 200)}`);
    }

    if (data.status === 'error') {
      throw new Error(data.text || 'Cobalt API error');
    }

    // Get the download URL
    let downloadUrl: string | undefined;

    if (data.status === 'redirect' || data.status === 'tunnel') {
      downloadUrl = data.url;
    } else if (data.status === 'picker' && data.picker && data.picker.length > 0) {
      // If multiple options, pick video
      const video = data.picker.find((p) => p.type === 'video') ?? data.picker[0];
      if (video) {
        downloadUrl = video.url;
      }
    }

    if (!downloadUrl) {
      throw new Error('No download URL from Cobalt');
    }

    await assertSafeUrl(downloadUrl);

    logger.info({ downloadUrl }, 'Downloading file from Cobalt URL');

    // Download the file
    const fileResponse = await fetch(downloadUrl);
    if (!fileResponse.ok) {
      throw new Error(`Failed to download file from Cobalt: ${fileResponse.status}`);
    }

    const contentLength = fileResponse.headers.get('content-length');
    const total = contentLength ? parseInt(contentLength, 10) : 0;

    // If we can't track progress or response.body is null, fallback to buffer
    if (!fileResponse.body || total === 0) {
      if (onProgress) onProgress(50); // Indicate Cobalt processing is done, now downloading
      const arrayBuffer = await fileResponse.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      if (buffer.length === 0) {
        throw new Error('Downloaded file is empty (0 bytes)');
      }
      await writeFile(outputPath, buffer);
      if (onProgress) onProgress(100);
    } else {
      // Stream with progress
      const fileStream = createWriteStream(outputPath);
      const reader = fileResponse.body.getReader();
      let loaded = 0;

      if (onProgress) onProgress(50); // Indicate Cobalt processing is done, now streaming download

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        loaded += value.length;
        if (onProgress && total > 0) {
          // Progress from 50% to 99% for the actual download
          onProgress(50 + Math.min((loaded / total) * 50, 49));
        }

        // Write chunk
        if (!fileStream.write(value)) {
          await new Promise((resolve) => fileStream.once('drain', resolve));
        }
      }

      fileStream.end();
      await new Promise((resolve) => fileStream.on('finish', resolve));

      if (onProgress) onProgress(100);
    }

    // Verify file was written correctly
    const fileStats = await stat(outputPath);
    if (fileStats.size === 0) {
      throw new Error('File written but size is 0 bytes');
    }

    logger.info({ outputPath, fileSize: fileStats.size }, 'File saved successfully');

    // Extract title from URL or use default
    const urlParts = url.split('/');
    const title = urlParts[urlParts.length - 1] || 'Downloaded Video';

    return {
      title: title.replace(/[?#].*$/, ''), // Remove query params
      metadata: { source: 'cobalt', size: fileStats.size },
    };
  },
};
