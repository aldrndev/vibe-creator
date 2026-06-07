import { createWriteStream } from 'node:fs';
import { stat, writeFile } from 'node:fs/promises';
import { assertSafeUrl } from '@/utils/ssrf';
import type { DownloadVideoOptions } from '../download.service';

function assertWithinMaxBytes(bytes: number, maxBytes?: number): void {
  if (typeof maxBytes === 'number' && bytes > maxBytes) {
    throw new Error('Downloaded file exceeds the allowed size');
  }
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
    const total = contentLength ? parseInt(contentLength, 10) : 0;
    assertWithinMaxBytes(total, options?.maxBytes);

    // If we can't track progress or response.body is null, fallback to buffer
    if (!response.body || total === 0) {
      if (onProgress) onProgress(10);
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      if (buffer.length === 0) throw new Error('Downloaded file is empty');
      assertWithinMaxBytes(buffer.length, options?.maxBytes);
      await writeFile(outputPath, buffer);
      if (onProgress) onProgress(100);

      const fileStats = await stat(outputPath);
      const urlParts = url.split('/');
      const filename = urlParts[urlParts.length - 1] || 'Downloaded Video';

      return {
        title: filename.replace(/[?#].*$/, ''),
        metadata: { source: 'direct', size: fileStats.size },
      };
    }

    // Stream with progress
    const fileStream = createWriteStream(outputPath);
    const reader = response.body.getReader();
    let loaded = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      loaded += value.length;
      assertWithinMaxBytes(loaded, options?.maxBytes);
      if (onProgress && total > 0) {
        onProgress(Math.min((loaded / total) * 100, 99));
      }

      // Write chunk
      if (!fileStream.write(value)) {
        await new Promise((resolve) => fileStream.once('drain', resolve));
      }
    }

    fileStream.end();
    await new Promise((resolve) => fileStream.on('finish', resolve));

    if (onProgress) onProgress(100);

    const fileStats = await stat(outputPath);
    const urlParts = url.split('/');
    const filename = urlParts[urlParts.length - 1] || 'Downloaded Video';

    return {
      title: filename.replace(/[?#].*$/, ''),
      metadata: { source: 'direct', size: fileStats.size },
    };
  },
};
