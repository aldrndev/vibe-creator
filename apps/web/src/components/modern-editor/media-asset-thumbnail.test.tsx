import { createTextLayer } from '@vibe-creator/shared';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { EditorAsset } from '@/stores/editor-store';
import { MediaAssetThumbnail } from './media-asset-thumbnail';

describe('MediaAssetThumbnail', () => {
  it('renders image previews for visual media assets', () => {
    const asset: EditorAsset = {
      id: 'asset-image',
      name: 'image.png',
      type: 'IMAGE',
      url: '/image.png',
      thumbnailUrl: '/thumb.jpg',
    };

    const markup = renderToStaticMarkup(<MediaAssetThumbnail asset={asset} variant="asset-card" />);

    expect(markup).toContain('src="/thumb.jpg"');
    expect(markup).toContain('IMAGE');
  });

  it('renders waveform marks for audio assets', () => {
    const asset: EditorAsset = {
      id: 'asset-audio',
      name: 'sound.mp3',
      type: 'AUDIO',
      url: '/sound.mp3',
    };

    const markup = renderToStaticMarkup(<MediaAssetThumbnail asset={asset} variant="asset-card" />);

    expect(markup).toContain('AUDIO');
    expect(markup).toContain('rounded-full bg-current');
  });

  it('renders compact text marks for text layers', () => {
    const layer = createTextLayer('text-layer', 'Hook title', 0, 0, 5000);

    const markup = renderToStaticMarkup(<MediaAssetThumbnail layer={layer} variant="layer" />);

    expect(markup).toContain('Aa');
    expect(markup).not.toContain('Hook title');
  });
});
