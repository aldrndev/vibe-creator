import { describe, expect, it } from 'vitest';
import {
  clampSubtitleFontSize,
  DIRECTOR_SUBTITLE_FONT_SIZE_MIN,
  resolveSubtitleFontSizeMax,
} from '@/lib/director-subtitle-style';

describe('director subtitle style helpers', () => {
  it('uses practical default max size when mode and position are not set', () => {
    expect(resolveSubtitleFontSizeMax()).toBe(56);
    expect(resolveSubtitleFontSizeMax({ mode: 'auto', quality: '1080p' })).toBe(56);
  });

  it('applies limits for cinematic and center subtitle layout', () => {
    expect(
      resolveSubtitleFontSizeMax({ mode: 'cinematic', position: 'bottom', quality: '1080p' }),
    ).toBe(44);
    expect(
      resolveSubtitleFontSizeMax({ mode: 'talking-head', position: 'center', quality: '1080p' }),
    ).toBe(56);
  });

  it('clamps subtitle font size inside min and combined max', () => {
    expect(
      clampSubtitleFontSize(80, { mode: 'cinematic', position: 'bottom', quality: '1080p' }),
    ).toBe(44);
    expect(
      clampSubtitleFontSize(80, { mode: 'talking-head', position: 'bottom', quality: '1080p' }),
    ).toBe(64);
    expect(clampSubtitleFontSize(8, { mode: 'general', position: 'bottom', quality: '720p' })).toBe(
      DIRECTOR_SUBTITLE_FONT_SIZE_MIN,
    );
  });

  it('uses tighter max on 720p landscape output', () => {
    expect(
      resolveSubtitleFontSizeMax({
        mode: 'talking-head',
        position: 'bottom',
        quality: '720p',
        aspectRatio: '16:9',
      }),
    ).toBe(43);
  });

  it('limits word animation by aspect ratio — portrait 9:16 is strictest', () => {
    expect(
      resolveSubtitleFontSizeMax({
        mode: 'talking-head',
        position: 'center',
        animation: 'word',
        quality: '1080p',
        aspectRatio: '9:16',
      }),
    ).toBe(28);
    expect(
      resolveSubtitleFontSizeMax({
        mode: 'talking-head',
        position: 'center',
        animation: 'word',
        quality: '1080p',
        aspectRatio: '1:1',
      }),
    ).toBe(34);
    expect(
      resolveSubtitleFontSizeMax({
        mode: 'talking-head',
        position: 'center',
        animation: 'word',
        quality: '1080p',
        aspectRatio: '16:9',
      }),
    ).toBe(44);
  });

  it('limits typewriter animation by aspect ratio', () => {
    expect(
      resolveSubtitleFontSizeMax({
        mode: 'talking-head',
        position: 'bottom',
        animation: 'typewriter',
        quality: '1080p',
        aspectRatio: '9:16',
      }),
    ).toBe(40);
    expect(
      resolveSubtitleFontSizeMax({
        mode: 'talking-head',
        position: 'bottom',
        animation: 'typewriter',
        quality: '1080p',
        aspectRatio: '16:9',
      }),
    ).toBe(52);
  });

  it('does not apply animation limit for non-restricted animations', () => {
    expect(
      resolveSubtitleFontSizeMax({
        mode: 'talking-head',
        position: 'bottom',
        animation: 'none',
        quality: '1080p',
      }),
    ).toBe(64);
    expect(
      resolveSubtitleFontSizeMax({
        mode: 'talking-head',
        position: 'bottom',
        animation: 'fade',
        quality: '1080p',
      }),
    ).toBe(64);
  });

  it('clamps social-hook word-by-word font size to 28px in portrait', () => {
    expect(
      clampSubtitleFontSize(56, {
        mode: 'general',
        position: 'center',
        animation: 'word',
        quality: '1080p',
        aspectRatio: '9:16',
      }),
    ).toBe(28);
  });

  it('defaults to portrait aspect ratio when not specified for word mode', () => {
    expect(
      resolveSubtitleFontSizeMax({
        mode: 'talking-head',
        position: 'center',
        animation: 'word',
        quality: '1080p',
      }),
    ).toBe(28);
  });
});
