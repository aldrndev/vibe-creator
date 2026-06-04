import { describe, expect, it } from 'vitest';
import {
  aiDirectorSearchSchema,
  trendingSearchSchema,
  videoStudioSearchSchema,
} from './route-search';

describe('route search schemas', () => {
  it('accepts a valid AI Director trending context', () => {
    expect(
      aiDirectorSearchSchema.parse({
        source: 'trending',
        topic: 'Viral video',
        sourceUrl: 'https://www.youtube.com/watch?v=abc123',
        thumbnailUrl: 'https://i.ytimg.com/vi/abc123/hqdefault.jpg',
        region: 'ID',
        rank: '7',
      }),
    ).toEqual({
      source: 'trending',
      topic: 'Viral video',
      sourceUrl: 'https://www.youtube.com/watch?v=abc123',
      thumbnailUrl: 'https://i.ytimg.com/vi/abc123/hqdefault.jpg',
      region: 'ID',
      rank: 7,
      session: undefined,
    });
  });

  it('falls back safely for invalid AI Director URL and rank params', () => {
    expect(
      aiDirectorSearchSchema.parse({
        source: 'trending',
        sourceUrl: 'javascript:alert(1)',
        rank: '-2',
      }),
    ).toMatchObject({
      source: 'trending',
      sourceUrl: undefined,
      rank: undefined,
    });
  });

  it('defaults trending region to Indonesia', () => {
    expect(trendingSearchSchema.parse({})).toEqual({ region: 'ID' });
    expect(trendingSearchSchema.parse({ region: 'XX' })).toEqual({ region: 'ID' });
  });

  it('keeps legacy Video Studio project query readable', () => {
    expect(videoStudioSearchSchema.parse({ project: 'legacy-1' })).toEqual({
      project: 'legacy-1',
      session: undefined,
    });
  });
});
