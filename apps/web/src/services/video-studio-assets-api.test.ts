import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  attachStudioAssetToProject,
  listAllVideoStudioAssets,
  listVideoStudioAssets,
} from './video-studio-assets-api';

const apiMock = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}));

vi.mock('@/services/api', () => ({
  api: apiMock,
  getApiUrl: (path: string) => (path.startsWith('/api/v1') ? `http://localhost:3000${path}` : path),
}));

function createAudioAsset(id: string) {
  return {
    id,
    kind: 'audio',
    title: id,
    description: 'Pop pendek',
    category: 'meme',
    tags: ['meme'],
    thumbnailUrl: null,
    previewUrl: `/api/v1/video-studio/assets/${id}/preview`,
    payload: {
      kind: 'audio-file',
      fileName: 'pixabay-meme/technology-memeclick-506437.mp3',
      mimeType: 'audio/mpeg',
      durationMs: 500,
    },
    durationMs: 500,
    license: {
      name: 'Pixabay Content License',
      sourceUrl: 'https://pixabay.com/sound-effects/technology-memeclick-506437/',
      attributionRequired: false,
      commercialUse: true,
    },
    source: 'pixabay-sound-effects',
    sortOrder: 1,
  };
}

describe('video studio assets api', () => {
  beforeEach(() => {
    apiMock.get.mockReset();
    apiMock.post.mockReset();
  });

  it('loads and normalizes catalog asset URLs', async () => {
    apiMock.get.mockResolvedValueOnce({
      success: true,
      data: {
        items: [createAudioAsset('meme-pop')],
        nextCursor: null,
        hasMore: false,
      },
    });

    const result = await listVideoStudioAssets({ kind: 'audio', limit: 10 });

    expect(apiMock.get).toHaveBeenCalledWith('/video-studio/assets?kind=audio&limit=10');
    expect(result.items[0]?.previewUrl).toBe(
      'http://localhost:3000/api/v1/video-studio/assets/meme-pop/preview',
    );
  });

  it('loads all paginated catalog assets', async () => {
    apiMock.get
      .mockResolvedValueOnce({
        success: true,
        data: {
          items: [createAudioAsset('meme-pop')],
          nextCursor: 'meme-pop',
          hasMore: true,
        },
      })
      .mockResolvedValueOnce({
        success: true,
        data: {
          items: [createAudioAsset('meme-fah')],
          nextCursor: null,
          hasMore: false,
        },
      });

    const result = await listAllVideoStudioAssets({ kind: 'audio', limit: 50 });

    expect(apiMock.get).toHaveBeenNthCalledWith(1, '/video-studio/assets?kind=audio&limit=50');
    expect(apiMock.get).toHaveBeenNthCalledWith(
      2,
      '/video-studio/assets?kind=audio&cursor=meme-pop&limit=50',
    );
    expect(result.items.map((asset) => asset.id)).toEqual(['meme-pop', 'meme-fah']);
    expect(result.hasMore).toBe(false);
  });

  it('attaches a studio asset to a project asset', async () => {
    apiMock.post.mockResolvedValueOnce({
      success: true,
      data: { id: 'asset-studio', sourceUrl: '/api/v1/projects/assets/asset-studio/file' },
    });

    const asset = await attachStudioAssetToProject('project-id', {
      id: 'asset-studio',
      name: 'Meme Pop',
      type: 'AUDIO',
      url: 'http://localhost:3000/api/v1/video-studio/assets/meme-pop/preview',
      studioAssetId: 'meme-pop',
    });

    expect(apiMock.post).toHaveBeenCalledWith('/projects/project-id/assets/from-studio-asset', {
      assetId: 'asset-studio',
      studioAssetId: 'meme-pop',
    });
    expect(asset.serverAssetId).toBe('asset-studio');
  });
});
