import { createWriteStream } from 'node:fs';
import { stat, writeFile } from 'node:fs/promises';
import { env } from '@/config/env';
import { createCircuitBreaker } from '@/lib/circuit-breaker';
import { logger } from '@/lib/logger';
import { assertSafeUrl } from '@/utils/ssrf';
import type { DownloadVideoOptions } from '../download.service';

interface CobaltResponse {
  status: 'error' | 'redirect' | 'tunnel' | 'picker';
  url?: string;
  urls?: string[];
  text?: string;
  picker?: Array<{ url: string; type: string }>;
}

interface CobaltRequestPayload {
  url: string;
  filenameStyle: 'basic';
  downloadMode: 'auto';
}

function assertWithinMaxBytes(bytes: number, maxBytes?: number): void {
  if (typeof maxBytes === 'number' && bytes > maxBytes) {
    throw new Error('Downloaded file exceeds the allowed size');
  }
}

export function buildCobaltRequestPayload(url: string): CobaltRequestPayload {
  return {
    url,
    filenameStyle: 'basic',
    downloadMode: 'auto',
  };
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

async function fetchCobaltApi(url: string, apiUrl: string): Promise<CobaltResponse> {
  const response = await cobaltBreaker.fire(apiUrl, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(buildCobaltRequestPayload(url)),
  });

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

  try {
    return JSON.parse(responseText) as CobaltResponse;
  } catch {
    throw new Error(`Cobalt API returned invalid JSON: ${responseText.slice(0, 200)}`);
  }
}

function extractDownloadUrl(data: CobaltResponse): string {
  if (data.status === 'error') {
    throw new Error(data.text || 'Cobalt API error');
  }

  let downloadUrl: string | undefined;

  if (data.status === 'redirect' || data.status === 'tunnel') {
    downloadUrl = data.url;
  } else if (data.status === 'picker' && data.picker && data.picker.length > 0) {
    const video = data.picker.find((p) => p.type === 'video') ?? data.picker[0];
    if (video) {
      downloadUrl = video.url;
    }
  }

  if (!downloadUrl) {
    throw new Error('No download URL from Cobalt');
  }
  return downloadUrl;
}

async function downloadFileBuffered(
  fileResponse: Response,
  outputPath: string,
  onProgress?: (percent: number) => void,
  maxBytes?: number,
): Promise<void> {
  if (onProgress) onProgress(50);
  const arrayBuffer = await fileResponse.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  if (buffer.length === 0) {
    throw new Error('Downloaded file is empty (0 bytes)');
  }
  assertWithinMaxBytes(buffer.length, maxBytes);
  await writeFile(outputPath, buffer);
  if (onProgress) onProgress(100);
}

async function downloadFileStreamed(
  fileResponse: Response,
  outputPath: string,
  total: number,
  onProgress?: (percent: number) => void,
  maxBytes?: number,
): Promise<void> {
  const fileStream = createWriteStream(outputPath);
  const reader = fileResponse.body?.getReader();
  if (!reader) {
    throw new Error('Failed to get body reader from response');
  }
  let loaded = 0;

  if (onProgress) onProgress(50);

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    loaded += value.length;
    assertWithinMaxBytes(loaded, maxBytes);
    if (onProgress && total > 0) {
      onProgress(50 + Math.min((loaded / total) * 50, 49));
    }

    if (!fileStream.write(value)) {
      await new Promise((resolve) => fileStream.once('drain', resolve));
    }
  }

  fileStream.end();
  await new Promise((resolve) => fileStream.on('finish', resolve));

  if (onProgress) onProgress(100);
}

export const downloadCobaltService = {
  /**
   * Download using Cobalt API
   */
  async runCobalt(
    url: string,
    outputPath: string,
    onProgress?: (percent: number) => void,
    options?: DownloadVideoOptions,
  ): Promise<{ title: string; metadata: Record<string, unknown> }> {
    await assertSafeUrl(url);

    if (!env.COBALT_API_URL) {
      throw new Error('Cobalt API URL not configured');
    }

    logger.info({ cobaltUrl: env.COBALT_API_URL, videoUrl: url }, 'Calling Cobalt API');

    const data = await fetchCobaltApi(url, env.COBALT_API_URL);
    const downloadUrl = extractDownloadUrl(data);

    await assertSafeUrl(downloadUrl);

    logger.info({ downloadUrl }, 'Downloading file from Cobalt URL');

    const fileResponse = await fetch(downloadUrl);
    if (!fileResponse.ok) {
      throw new Error(`Failed to download file from Cobalt: ${fileResponse.status}`);
    }

    const contentLength = fileResponse.headers.get('content-length');
    const total = contentLength ? Number.parseInt(contentLength, 10) : 0;
    assertWithinMaxBytes(total, options?.maxBytes);

    if (!fileResponse.body || total === 0) {
      await downloadFileBuffered(fileResponse, outputPath, onProgress, options?.maxBytes);
    } else {
      await downloadFileStreamed(fileResponse, outputPath, total, onProgress, options?.maxBytes);
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
