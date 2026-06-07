import { createWriteStream } from 'node:fs';
import { stat, writeFile } from 'node:fs/promises';
import { assertSafeUrl } from '@/utils/ssrf';
import type { DownloadVideoOptions } from '../download.service';

function assertWithinMaxBytes(bytes: number, maxBytes?: number): void {
  if (typeof maxBytes === 'number' && bytes > maxBytes) {
    throw new Error('Downloaded file exceeds the allowed size');
  }
}

async function downloadFileBuffered(
  response: Response,
  outputPath: string,
  onProgress?: (percent: number) => void,
  maxBytes?: number,
): Promise<void> {
  if (onProgress) onProgress(10);
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  if (buffer.length === 0) throw new Error('Downloaded file is empty');
  assertWithinMaxBytes(buffer.length, maxBytes);
  await writeFile(outputPath, buffer);
  if (onProgress) onProgress(100);
}

async function downloadFileStreamed(
  response: Response,
  outputPath: string,
  total: number,
  onProgress?: (percent: number) => void,
  maxBytes?: number,
): Promise<void> {
  const fileStream = createWriteStream(outputPath);
  const reader = response.body?.getReader();
  if (!reader) throw new Error('Failed to get body reader');

  let loaded = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    loaded += value.length;
    assertWithinMaxBytes(loaded, maxBytes);
    if (onProgress && total > 0) {
      onProgress(Math.min((loaded / total) * 100, 99));
    }

    if (!fileStream.write(value)) {
      await new Promise((resolve) => fileStream.once('drain', resolve));
    }
  }

  fileStream.end();
  await new Promise((resolve) => fileStream.on('finish', resolve));

  if (onProgress) onProgress(100);
}

function extractVideoTitle(url: string): string {
  const urlParts = url.split('/');
  const filename = urlParts[urlParts.length - 1] || 'Downloaded Video';
  return filename.replace(/[?#].*$/, '');
}

export const downloadDirectService = {
  /**
   * Download direct video URL
   */
  async downloadDirectUrl(
    url: string,
    outputPath: string,
    onProgress?: (percent: number) => void,
    options?: DownloadVideoOptions,
  ): Promise<{ title: string; metadata: Record<string, unknown> }> {
    await assertSafeUrl(url);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download direct URL: ${response.status}`);
    }

    const contentLength = response.headers.get('content-length');
    const total = contentLength ? Number.parseInt(contentLength, 10) : 0;
    assertWithinMaxBytes(total, options?.maxBytes);

    if (!response.body || total === 0) {
      await downloadFileBuffered(response, outputPath, onProgress, options?.maxBytes);
    } else {
      await downloadFileStreamed(response, outputPath, total, onProgress, options?.maxBytes);
    }

    const fileStats = await stat(outputPath);

    return {
      title: extractVideoTitle(url),
      metadata: { source: 'direct', size: fileStats.size },
    };
  },
};
