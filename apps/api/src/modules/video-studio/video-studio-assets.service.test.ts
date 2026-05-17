import { mkdtemp, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { studioAssetListResponseSchema } from './video-studio.schemas';
import {
  getStudioAsset,
  getStudioAudioAssetFileExtension,
  getStudioAudioAssetMimeType,
  listStudioAssets,
  materializeStudioAudioAsset,
} from './video-studio-assets.service';

describe('video studio asset catalog', () => {
  it('lists assets by kind and category with cursor pagination', () => {
    const firstPage = listStudioAssets({ kind: 'audio', category: 'meme', limit: 2 });

    expect(firstPage.items).toHaveLength(2);
    expect(firstPage.items.every((asset) => asset.kind === 'audio')).toBe(true);
    expect(firstPage.items.every((asset) => asset.category === 'meme')).toBe(true);
    expect(firstPage.hasMore).toBe(true);

    const nextPage = listStudioAssets({
      kind: 'audio',
      category: 'meme',
      limit: 2,
      cursor: firstPage.nextCursor ?? undefined,
    });
    expect(nextPage.items[0]?.id).not.toBe(firstPage.items[0]?.id);
  });

  it('searches by title, description, category, or tags', () => {
    const result = listStudioAssets({ kind: 'text', q: 'caption', limit: 10 });

    expect(result.items.length).toBeGreaterThan(0);
    expect(result.items.some((asset) => asset.id === 'caption')).toBe(true);
  });

  it('returns a detail asset with insertable payload metadata', () => {
    const asset = getStudioAsset('opening-question');

    expect(asset?.kind).toBe('text');
    expect(asset?.payload.kind).toBe('text-layer');
    expect(asset?.title).toBe('Pertanyaan Pembuka');
  });

  it('keeps the full catalog compatible with the public response schema', () => {
    const result = listStudioAssets({ limit: 50 });

    expect(() =>
      studioAssetListResponseSchema.parse({
        success: true,
        data: result,
      }),
    ).not.toThrow();
  });

  it('materializes real stored audio assets as playable files', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'studio-audio-'));
    const filePath = join(tempDir, 'meme-pop.mp3');
    const asset = getStudioAsset('meme-pop');

    await materializeStudioAudioAsset('meme-pop', filePath);

    const fileStats = await stat(filePath);
    expect(fileStats.size).toBeGreaterThan(1000);
    expect(asset?.payload.kind).toBe('audio-file');
    expect(asset?.license.name).toBe('Pixabay Content License');
    expect(asset ? getStudioAudioAssetMimeType(asset) : null).toBe('audio/mpeg');
    expect(asset ? getStudioAudioAssetFileExtension(asset) : null).toBe('.mp3');
  });
});
