import { describe, expect, it } from 'vitest';
import { videoExportService } from '@/modules/director/processing/video-export.service';
import {
  applySubtitleHold,
  buildSpeakerTurnSubtitleSegments,
  buildSubtitleForceStyle,
  buildSubtitlesFilter,
  createSubtitleAsset,
  generateSRT,
  isMissingSubtitlesFilterError,
  resolveSubtitleDisplaySegments,
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

  it('limits subtitle font size based on cinematic content mode', () => {
    const forceStyle = buildSubtitleForceStyle({
      fontSize: 80,
      contentMode: 'cinematic',
    });

    expect(forceStyle).toContain('FontSize=56');
  });

  it('limits subtitle font size with safe default cap when content mode is auto', () => {
    const forceStyle = buildSubtitleForceStyle({
      fontSize: 80,
      contentMode: 'auto',
    });

    expect(forceStyle).toContain('FontSize=64');
  });

  it('keeps higher cap for talking-head content mode', () => {
    const forceStyle = buildSubtitleForceStyle({
      fontSize: 48,
      contentMode: 'talking-head',
    });

    expect(forceStyle).toContain('FontSize=48');
  });

  it('applies stricter cap for center position subtitles', () => {
    const forceStyle = buildSubtitleForceStyle({
      fontSize: 80,
      contentMode: 'talking-head',
      position: 'center',
    });

    expect(forceStyle).toContain('FontSize=72');
  });

  it('uses proportional mapped max font size on 720p landscape output quality', () => {
    const forceStyle = buildSubtitleForceStyle({
      fontSize: 80,
      contentMode: 'talking-head',
      position: 'bottom',
      quality: '720p',
      aspectRatio: '16:9',
    });

    expect(forceStyle).toContain('FontSize=27');
  });

  it('maps top/center/bottom subtitle positions with 30/50/30 anchors', () => {
    const topStyle = buildSubtitleForceStyle({
      position: 'top',
    });
    const centerStyle = buildSubtitleForceStyle({
      position: 'center',
    });
    const bottomStyle = buildSubtitleForceStyle({
      position: 'bottom',
    });

    expect(topStyle).toContain('Alignment=8');
    expect(topStyle).toContain('MarginV=576');
    expect(centerStyle).toContain('Alignment=5');
    expect(centerStyle).toContain('MarginV=0');
    expect(bottomStyle).toContain('Alignment=2');
    expect(bottomStyle).toContain('MarginV=576');
  });

  it('maps aspect ratio to the expected ffmpeg filter', () => {
    expect(videoExportService.getAspectRatioFilter('16:9')).toBe(
      'scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=black',
    );
    expect(videoExportService.getAspectRatioFilter('1:1')).toBe(
      'scale=1080:1080:force_original_aspect_ratio=decrease,pad=1080:1080:(ow-iw)/2:(oh-ih)/2:color=black',
    );
    expect(videoExportService.getAspectRatioFilter('9:16', '720p')).toBe(
      'scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280',
    );
    expect(videoExportService.getAspectRatioFilter('9:16', '1080p')).toBe(
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
    expect(filter).toContain(String.raw`force_style=Fontname=Inter\,FontSize=24`);
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
    expect(asset.content).toContain(String.raw`{\k40}Hello`);
  });

  it('keeps Viral Pop effect when the animation is customized to karaoke', () => {
    const asset = createSubtitleAsset(
      [
        {
          startMs: 0,
          endMs: 1_200,
          text: 'Hello there',
          words: [
            { startMs: 0, endMs: 400, text: 'Hello' },
            { startMs: 450, endMs: 900, text: 'there' },
          ],
        },
      ],
      {
        stylePreset: 'viral-pop',
        animation: 'typewriter',
        fontToken: 'F_SERIF',
        fontSize: 52,
        textColorToken: 'C_YELLOW',
        bgColorToken: 'BG_TRANSPARENT',
        position: 'center',
      },
    );

    expect(asset.extension).toBe('ass');
    expect(asset.content).toContain('Fontsize');
    expect(asset.content).toContain(String.raw`\fscx118`);
    expect(asset.content).toContain('Dialogue: 0,0:00:00.00,0:00:00.45');
    expect(asset.content).toContain('Hello');
    expect(asset.content).toContain('there');
  });

  it('creates ASS word-by-word subtitles when word animation is selected', () => {
    const asset = createSubtitleAsset(
      [
        {
          startMs: 0,
          endMs: 1_200,
          text: 'Hello there',
          words: [
            { startMs: 0, endMs: 500, text: 'Hello' },
            { startMs: 500, endMs: 1_000, text: 'there' },
          ],
        },
      ],
      {
        animation: 'word',
        textColorToken: 'C_WHITE',
      },
    );

    expect(asset.extension).toBe('ass');
    expect(asset.useForceStyle).toBe(false);
    expect(asset.content).toContain('Dialogue: 0,0:00:00.00,0:00:00.50');
    expect(asset.content).toContain('Hello');
    expect(asset.content).toContain('there');
  });

  it('keeps ASS karaoke cue end time exact (no artificial hold delay)', () => {
    const asset = createSubtitleAsset(
      [
        {
          startMs: 0,
          endMs: 1_000,
          text: 'Hello there',
          words: [
            { startMs: 0, endMs: 500, text: 'Hello' },
            { startMs: 500, endMs: 1_000, text: 'there' },
          ],
        },
        {
          startMs: 1_260,
          endMs: 2_000,
          text: 'Second cue',
          words: [
            { startMs: 1_260, endMs: 1_600, text: 'Second' },
            { startMs: 1_600, endMs: 2_000, text: 'cue' },
          ],
        },
      ],
      {
        animation: 'typewriter',
        textColorToken: 'C_WHITE',
      },
    );

    expect(asset.extension).toBe('ass');
    expect(asset.content).toContain('Dialogue: 0,0:00:00.00,0:00:01.00');
  });

  it('uses export play resolution in ASS header for stable subtitle scale', () => {
    const portraitAsset = createSubtitleAsset([{ startMs: 0, endMs: 1_000, text: 'Halo semua' }], {
      animation: 'typewriter',
      aspectRatio: '9:16',
      quality: '1080p',
    });
    const landscapeAsset = createSubtitleAsset([{ startMs: 0, endMs: 1_000, text: 'Halo semua' }], {
      animation: 'typewriter',
      aspectRatio: '16:9',
      quality: '720p',
    });

    expect(portraitAsset.content).toContain('PlayResX: 1080');
    expect(portraitAsset.content).toContain('PlayResY: 1920');
    expect(landscapeAsset.content).toContain('PlayResX: 1280');
    expect(landscapeAsset.content).toContain('PlayResY: 720');
  });

  it('creates ASS karaoke subtitles with synthetic timings when word timestamps are missing', () => {
    const asset = createSubtitleAsset(
      [
        {
          startMs: 0,
          endMs: 1_600,
          text: 'Ini hook cepat',
        },
      ],
      {
        animation: 'typewriter',
        textColorToken: 'C_WHITE',
      },
    );

    expect(asset.extension).toBe('ass');
    expect(asset.content).toContain(String.raw`{\k`);
    expect(asset.content).toContain('Ini');
  });

  it('uses synthetic subtitle words when word timestamps do not cover full text', () => {
    const asset = createSubtitleAsset(
      [
        {
          startMs: 0,
          endMs: 1_500,
          text: 'Hello missing there',
          words: [
            { startMs: 0, endMs: 350, text: 'Hello' },
            { startMs: 1_000, endMs: 1_400, text: 'there' },
          ],
        },
      ],
      {
        animation: 'typewriter',
        textColorToken: 'C_WHITE',
      },
    );

    expect(asset.extension).toBe('ass');
    expect(asset.content).toContain('Hello');
    expect(asset.content).toContain('missing');
    expect(asset.content).toContain('there');
  });

  it('creates viral pop word subtitles with enlarged synthetic words inside clip timing', () => {
    const asset = createSubtitleAsset(
      [
        {
          startMs: 0,
          endMs: 900,
          text: 'Hook cepat banget',
        },
      ],
      {
        animation: 'pop-word',
        fontSize: 52,
        textColorToken: 'C_YELLOW',
        bgColorToken: 'BG_TRANSPARENT',
        position: 'center',
      },
    );

    expect(asset.extension).toBe('ass');
    expect(asset.useForceStyle).toBe(false);
    expect(asset.content.match(/^Dialogue:/gm) ?? []).toHaveLength(3);
    expect(asset.content).toContain(String.raw`\fs63`);
    expect(asset.content).toContain(String.raw`\fscx118`);
    expect(asset.content).toContain('Hook');
    expect(asset.content).toContain('cepat');
    expect(asset.content).toContain('banget');
    expect(asset.content).toContain('Dialogue: 0,0:00:00.60,0:00:00.90');
    expect(asset.content).not.toContain('0:00:00.91');
  });

  it('renders transparent orange karaoke captions with stronger glow-style outline', () => {
    const asset = createSubtitleAsset([{ startMs: 0, endMs: 1_000, text: 'Neon glow' }], {
      animation: 'typewriter',
      textColorToken: 'C_ORANGE',
      bgColorToken: 'BG_TRANSPARENT',
      position: 'center',
    });

    const styleLine = asset.content.split('\n').find((line) => line.startsWith('Style: Default'));

    expect(styleLine).toContain(',3,3,2,5,');
  });

  it('drops out-of-range karaoke words to avoid lead or lag timing', () => {
    const asset = createSubtitleAsset(
      [
        {
          startMs: 500,
          endMs: 1_400,
          text: 'Kayaknya aku',
          words: [
            { startMs: 100, endMs: 300, text: 'noise' },
            { startMs: 500, endMs: 900, text: 'Kayaknya' },
            { startMs: 900, endMs: 1_350, text: 'aku' },
          ],
        },
      ],
      {
        animation: 'typewriter',
        textColorToken: 'C_WHITE',
      },
    );

    expect(asset.content).not.toContain('noise');
    expect(asset.content).toContain('Kayaknya');
  });

  it('merges close subtitle segments into one speaker turn for cinematic mode', () => {
    const merged = buildSpeakerTurnSubtitleSegments([
      { startMs: 0, endMs: 1_000, text: 'Ini hook pembuka.' },
      { startMs: 1_220, endMs: 2_300, text: 'Lalu lanjut value konten.' },
    ]);

    expect(merged).toHaveLength(1);
    expect(merged[0]?.text).toBe('Ini hook pembuka. Lalu lanjut value konten.');
    expect(merged[0]?.startMs).toBe(0);
    expect(merged[0]?.endMs).toBe(2_300);
  });

  it('keeps separated turns when gap is long even in cinematic mode', () => {
    const resolved = resolveSubtitleDisplaySegments(
      [
        { startMs: 0, endMs: 1_000, text: 'Turn satu.' },
        { startMs: 2_000, endMs: 3_000, text: 'Turn dua.' },
      ],
      { animation: 'phrase' },
    );

    expect(resolved).toHaveLength(2);
  });

  it('does not merge subtitle turns when speaker label changes', () => {
    const resolved = resolveSubtitleDisplaySegments(
      [
        { startMs: 0, endMs: 1_000, text: 'Turn speaker satu.', speaker: 'SPEAKER_00' },
        { startMs: 1_220, endMs: 2_200, text: 'Turn speaker dua.', speaker: 'SPEAKER_01' },
      ],
      { animation: 'phrase' },
    );

    expect(resolved).toHaveLength(2);
    expect(resolved[0]?.speaker).toBe('SPEAKER_00');
    expect(resolved[1]?.speaker).toBe('SPEAKER_01');
  });

  it('creates ASS with merged turn content for phrase animation', () => {
    const asset = createSubtitleAsset(
      [
        { startMs: 0, endMs: 1_000, text: 'Ini hook pembuka.' },
        { startMs: 1_220, endMs: 2_300, text: 'Lalu lanjut value konten.' },
      ],
      { animation: 'phrase' },
    );

    expect(asset.extension).toBe('ass');
    expect((asset.content.match(/^Dialogue:/gm) ?? []).length).toBe(1);
    expect(asset.content).toContain('Ini hook pembuka.');
    expect(asset.content).toContain('value konten.');
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

  it('detects ffmpeg builds that do not support the deshake filter', () => {
    expect(
      videoExportService.isMissingDeshakeFilterError(
        new Error("Clip 1 gagal diproses: No such filter: 'deshake'"),
      ),
    ).toBe(true);

    expect(videoExportService.isMissingDeshakeFilterError(new Error('permission denied'))).toBe(
      false,
    );
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

  it('uses ffmpeg deshake filter for stabilize mode', () => {
    expect(videoExportService.getStabilizeFilter()).toContain('deshake=');
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
    expect(chunks[0]?.text.length).toBeLessThanOrEqual(48);
    expect(chunks.at(-1)?.endMs).toBe(4_000);
  });

  it('wraps subtitle text into readable lines based on length limit', () => {
    const wrapped = wrapSubtitleText(
      'Ini contoh subtitle yang perlu dibungkus menjadi lebih dari satu baris',
    );

    expect(wrapped).toContain('\n');
    expect(wrapped.split('\n').length).toBeGreaterThan(1);
    expect(wrapped.split('\n').every((line) => line.length <= 25)).toBe(true);
  });

  it('keeps SRT cue timing exact without additional hold delay', () => {
    const srt = generateSRT([
      { startMs: 0, endMs: 1_000, text: 'Cue satu' },
      { startMs: 1_260, endMs: 2_000, text: 'Cue dua' },
    ]);

    expect(srt).toContain('00:00:00,000 --> 00:00:01,000');
    expect(srt).not.toContain('00:00:00,000 --> 00:00:01,200');
  });

  it('extends subtitle visibility slightly to avoid flicker between close cues', () => {
    const held = applySubtitleHold([
      { startMs: 0, endMs: 1_000, text: 'Cue 1' },
      { startMs: 1_260, endMs: 2_000, text: 'Cue 2' },
    ]);

    expect(held[0]?.endMs).toBe(1_200);
    expect(held[1]?.endMs).toBe(2_000);
  });
});
