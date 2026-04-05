import { describe, expect, it } from 'vitest';
import { videoExportService } from '@/modules/director/processing/video-export.service';
import {
  buildSubtitleForceStyle,
  buildSubtitlesFilter,
  createSubtitleAsset,
  isMissingSubtitlesFilterError,
  segmentSubtitlesForSrt,
  wrapSubtitleText,
} from '@/modules/director/processing/video-export-subtitles';

describe('videoExportService helpers', () => {
  it('builds subtitle style from session subtitle settings', () => {
    const forceStyle = buildSubtitleForceStyle({
      fontToken: 'F_INTER',
      textColorToken: 'C_ORANGE',
      bgColorToken: 'C_BLACK',
      fontSize: 30,
      position: 'top',
    });

    expect(forceStyle).toContain('Fontname=Inter');
    expect(forceStyle).toContain('FontSize=30');
    expect(forceStyle).toContain('PrimaryColour=&H000066FF');
    expect(forceStyle).toContain('BackColour=&H80000000');
    expect(forceStyle).toContain('Alignment=8');
  });

  it('maps aspect ratio to the expected ffmpeg filter', () => {
    expect(videoExportService.getAspectRatioFilter('16:9')).toBe(
      'scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=black',
    );
    expect(videoExportService.getAspectRatioFilter('1:1')).toBe(
      'scale=1080:1080:force_original_aspect_ratio=decrease,pad=1080:1080:(ow-iw)/2:(oh-ih)/2:color=black',
    );
    expect(videoExportService.getAspectRatioFilter('9:16', '720p')).toBe(
      'scale=720:1280:force_original_aspect_ratio=decrease,pad=720:1280:(ow-iw)/2:(oh-ih)/2:color=black',
    );
    expect(videoExportService.getAspectRatioFilter('9:16', '1080p', true)).toBe(
      'scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920',
    );
  });

  it('builds subtitles filter without shell-style quotes and escapes filter values', () => {
    const filter = buildSubtitlesFilter('uploads/director/exports/temp_sub_1.srt', {
      fontToken: 'F_INTER',
      textColorToken: 'C_WHITE',
      bgColorToken: 'C_BLACK',
      fontSize: 24,
      position: 'bottom',
    });

    expect(filter).toContain('subtitles=filename=uploads/director/exports/temp_sub_1.srt');
    expect(filter).toContain('force_style=Fontname=Inter\\,FontSize=24');
    expect(filter).not.toContain("subtitles='");
  });

  it('creates ASS karaoke subtitles when typewriter animation and word timings are available', () => {
    const asset = createSubtitleAsset(
      [
        {
          startMs: 0,
          endMs: 1200,
          text: 'Hello there',
          words: [
            { startMs: 0, endMs: 400, text: 'Hello' },
            { startMs: 450, endMs: 900, text: 'there' },
          ],
        },
      ],
      {
        animation: 'typewriter',
        textColorToken: 'C_WHITE',
      },
    );

    expect(asset.extension).toBe('ass');
    expect(asset.useForceStyle).toBe(false);
    expect(asset.content).toContain('[V4+ Styles]');
    expect(asset.content).toContain('{\\k40}Hello');
  });

  it('detects ffmpeg builds that do not support the subtitles filter', () => {
    expect(
      isMissingSubtitlesFilterError(
        new Error("Clip 1 gagal diproses: No such filter: 'subtitles'"),
      ),
    ).toBe(true);

    expect(
      isMissingSubtitlesFilterError(new Error('Clip 1 gagal diproses: permission denied')),
    ).toBe(false);
  });

  it('adds loudnorm filter when audio normalization is enabled', () => {
    const args = videoExportService.buildClipProcessingArgs(
      {
        sourcePath: 'input.mp4',
        start: 0,
        end: 12,
      },
      'output.mp4',
      ['scale=1080:1920'],
      '1080p',
      true,
    );

    expect(args).toContain('-af');
    expect(args).toContain('loudnorm=I=-16:TP=-1.5:LRA=11');
  });

  it('skips loudnorm filter when audio normalization is disabled', () => {
    const args = videoExportService.buildClipProcessingArgs(
      {
        sourcePath: 'input.mp4',
        start: 0,
        end: 12,
      },
      'output.mp4',
      ['scale=1080:1920'],
      '1080p',
      false,
    );

    expect(args).not.toContain('-af');
  });

  it('builds a dual-input ffmpeg command for tracked video with original audio', () => {
    const args = videoExportService.buildTrackedClipProcessingArgs(
      'tracked.mp4',
      'audio.mp4',
      'output.mp4',
      ['setsar=1'],
      '1080p',
      true,
    );

    expect(args).toContain('tracked.mp4');
    expect(args).toContain('audio.mp4');
    expect(args).toContain('-map');
    expect(args).toContain('0:v:0');
    expect(args).toContain('1:a:0?');
    expect(args).toContain('-shortest');
  });

  it('enables face tracking only for portrait exports when requested', () => {
    expect(videoExportService.shouldUseFaceTracking({ faceTracking: true }, '9:16')).toBe(true);
    expect(videoExportService.shouldUseFaceTracking({ faceTracking: true }, '16:9')).toBe(false);
    expect(videoExportService.shouldUseFaceTracking({ faceTracking: false }, '9:16')).toBe(false);
  });

  it('splits long subtitle cues into shorter timed chunks', () => {
    const chunks = segmentSubtitlesForSrt([
      {
        startMs: 0,
        endMs: 4_000,
        text: 'Ini adalah contoh subtitle yang terlalu panjang untuk satu cue sehingga harus dipecah.',
      },
    ]);

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0]?.text.length).toBeLessThanOrEqual(42);
    expect(chunks.at(-1)?.endMs).toBe(4_000);
  });

  it('wraps subtitle text into at most two readable lines', () => {
    const wrapped = wrapSubtitleText('Ini contoh subtitle yang perlu dibungkus menjadi dua baris');

    expect(wrapped).toContain('\n');
    expect(wrapped.split('\n')).toHaveLength(2);
  });
});
