import { describe, expect, it } from 'vitest';
import { buildAudioMixFilter, type ExportAudioTrack } from './audio-track.processor';

const musicTrack: ExportAudioTrack = {
  localPath: '/uploads/temp/music.mp3',
  startTime: 1.5,
  endTime: 7,
  timelineStartMs: 2000,
  timelineEndMs: 6500,
  volume: 0.65,
  fadeInMs: 500,
  fadeOutMs: 750,
};

describe('audio track processor', () => {
  it('builds a delayed mix filter for standalone music tracks', () => {
    const filter = buildAudioMixFilter({
      hasBaseAudio: true,
      baseAudioInputIndex: 0,
      audioInputStartIndex: 1,
      audioTracks: [musicTrack],
    });

    expect(filter).toContain('[0:a:0]volume=1[basea]');
    expect(filter).toContain('[1:a:0]atrim=start=1.500:end=6.000');
    expect(filter).toContain('afade=t=in:st=0:d=0.500');
    expect(filter).toContain('afade=t=out:st=3.750:d=0.750');
    expect(filter).toContain('volume=0.65');
    expect(filter).toContain('adelay=delays=2000:all=1');
    expect(filter).toContain('[basea][a0]amix=inputs=2:duration=longest');
  });

  it('uses a silent base when the rendered video has no audio stream', () => {
    const filter = buildAudioMixFilter({
      hasBaseAudio: false,
      baseAudioInputIndex: 1,
      audioInputStartIndex: 2,
      audioTracks: [musicTrack],
    });

    expect(filter).toContain('[1:a:0]volume=0[basea]');
    expect(filter).toContain('[2:a:0]atrim=start=1.500:end=6.000');
  });
});
