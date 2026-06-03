import { describe, expect, it } from 'vitest';
import { buildStreamArgs, getRtmpUrl } from '../../services/rtmp.utils';

describe('rtmp streaming utilities', () => {
  it('sanitizes duplicated slashes before appending stream key', () => {
    expect(getRtmpUrl('custom', 'secret-key', 'rtmps://example.com/live/')).toBe(
      'rtmps://example.com/live/secret-key',
    );
  });

  it('uses scale and pad so source video is not stretched', () => {
    const args = buildStreamArgs(
      '/tmp/source.mp4',
      {
        platform: 'youtube',
        streamKey: 'secret-key',
        quality: '720p',
        bitrateKbps: 2500,
        durationMinutes: 60,
      },
      'rtmp://example.com/live/secret-key',
      true,
    );

    expect(args).toContain(
      'scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,setsar=1',
    );
    expect(args).toContain('yuv420p');
  });

  it('adds silent AAC source when video has no audio stream', () => {
    const args = buildStreamArgs(
      '/tmp/silent.mp4',
      {
        platform: 'youtube',
        streamKey: 'secret-key',
        quality: '1080p',
        durationMinutes: 60,
      },
      'rtmp://example.com/live/secret-key',
      false,
    );

    expect(args).toContain('anullsrc=channel_layout=stereo:sample_rate=44100');
    expect(args).toContain('1:a:0');
    expect(args.join(' ')).toContain('scale=1920:1080');
  });
});
