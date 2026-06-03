import { describe, expect, it } from 'vitest';
import {
  buildTrendingDirectorUrl,
  clearDirectorInitialContextSearchParams,
  resolveInitialSourceUrl,
  resolveTrendingImportContext,
} from './ai-director-trending-context';

function getSearchParamsFromPath(path: string): URLSearchParams {
  const query = path.split('?')[1] ?? '';
  return new URLSearchParams(query);
}

describe('ai director trending context', () => {
  it('builds a trending director URL with source metadata', () => {
    const path = buildTrendingDirectorUrl({
      title: 'Video viral: kopi & hujan?',
      sourceUrl: 'https://www.youtube.com/watch?v=abc123',
      thumbnailUrl: 'https://img.youtube.com/vi/abc123/hqdefault.jpg',
      region: 'ID',
      rank: 7,
    });

    const searchParams = getSearchParamsFromPath(path);

    expect(path.startsWith('/tools/ai-director?')).toBe(true);
    expect(searchParams.get('source')).toBe('trending');
    expect(searchParams.get('topic')).toBe('Video viral: kopi & hujan?');
    expect(searchParams.get('sourceUrl')).toBe('https://www.youtube.com/watch?v=abc123');
    expect(searchParams.get('thumbnailUrl')).toBe(
      'https://img.youtube.com/vi/abc123/hqdefault.jpg',
    );
    expect(searchParams.get('region')).toBe('ID');
    expect(searchParams.get('rank')).toBe('7');
  });

  it('resolves a valid trending context from query params', () => {
    const context = resolveTrendingImportContext(
      new URLSearchParams({
        source: 'trending',
        topic: 'Top video',
        sourceUrl: 'https://youtu.be/abc123',
        thumbnailUrl: 'https://img.youtube.com/vi/abc123/hqdefault.jpg',
        region: 'id',
        rank: '2',
      }),
    );

    expect(context).toEqual({
      sourceUrl: 'https://youtu.be/abc123',
      topic: 'Top video',
      thumbnailUrl: 'https://img.youtube.com/vi/abc123/hqdefault.jpg',
      region: 'ID',
      rank: 2,
    });
  });

  it('rejects invalid trending source URLs without falling back to URL import', () => {
    const searchParams = new URLSearchParams({
      source: 'trending',
      topic: 'Top video',
      sourceUrl: 'javascript:alert(1)',
    });

    expect(resolveTrendingImportContext(searchParams)).toBeNull();
    expect(resolveInitialSourceUrl(searchParams, null)).toBeNull();
  });

  it('keeps normal source URLs when the request is not from trending', () => {
    const searchParams = new URLSearchParams({
      topic: 'Regular idea',
      sourceUrl: 'https://example.com/video.mp4',
    });

    expect(resolveInitialSourceUrl(searchParams, null)).toBe('https://example.com/video.mp4');
  });

  it('clears initial context keys while preserving unrelated params', () => {
    const cleared = clearDirectorInitialContextSearchParams(
      new URLSearchParams({
        session: 'session-1',
        source: 'trending',
        topic: 'Top video',
        sourceUrl: 'https://youtu.be/abc123',
        thumbnailUrl: 'https://img.youtube.com/vi/abc123/hqdefault.jpg',
        region: 'ID',
        rank: '1',
        keep: 'yes',
      }),
    );

    expect(cleared.get('session')).toBe('session-1');
    expect(cleared.get('keep')).toBe('yes');
    expect(cleared.has('source')).toBe(false);
    expect(cleared.has('topic')).toBe(false);
    expect(cleared.has('sourceUrl')).toBe(false);
    expect(cleared.has('thumbnailUrl')).toBe(false);
    expect(cleared.has('region')).toBe(false);
    expect(cleared.has('rank')).toBe(false);
  });
});
