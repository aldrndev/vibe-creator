import { describe, expect, it } from 'vitest';
import { buildCobaltRequestPayload } from '../../services/download.cobalt.service';

describe('downloadCobaltService request payload', () => {
  it('builds payload without fixed resolution or codec constraints', () => {
    const payload = buildCobaltRequestPayload('https://www.youtube.com/watch?v=abc123');

    expect(payload).toEqual({
      url: 'https://www.youtube.com/watch?v=abc123',
      filenameStyle: 'basic',
      downloadMode: 'auto',
    });
    expect(payload).not.toHaveProperty('videoQuality');
    expect(payload).not.toHaveProperty('youtubeVideoCodec');
  });
});
