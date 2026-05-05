import { describe, expect, it } from 'vitest';
import {
  clampSubtitleFontSize,
  DIRECTOR_SUBTITLE_FONT_SIZE_MIN,
  resolveSubtitleFontSizeMax,
  resolveSubtitleFontSizePreset,
  resolveSubtitleFontSizePresetValue,
} from '@/lib/director-subtitle-style';

describe('director subtitle style helpers', () => {
  it('uses practical default max size when mode and position are not set', () => {
    expect(resolveSubtitleFontSizeMax()).toBe(64);
    expect(resolveSubtitleFontSizeMax({ mode: 'auto', quality: '1080p' })).toBe(64);
  });

  it('applies limits for cinematic and center subtitle layout', () => {
    expect(
      resolveSubtitleFontSizeMax({ mode: 'cinematic', position: 'bottom', quality: '1080p' }),
    ).toBe(56);
    expect(
      resolveSubtitleFontSizeMax({ mode: 'talking-head', position: 'center', quality: '1080p' }),
    ).toBe(72);
  });

  it('clamps subtitle font size inside min and combined max', () => {
    expect(
      clampSubtitleFontSize(80, { mode: 'cinematic', position: 'bottom', quality: '1080p' }),
    ).toBe(56);
    expect(
      clampSubtitleFontSize(80, { mode: 'talking-head', position: 'bottom', quality: '1080p' }),
    ).toBe(72);
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
    ).toBe(72);
    expect(
      resolveSubtitleFontSizeMax({
        mode: 'talking-head',
        position: 'center',
        animation: 'word',
        quality: '1080p',
        aspectRatio: '1:1',
      }),
    ).toBe(65);
    expect(
      resolveSubtitleFontSizeMax({
        mode: 'talking-head',
        position: 'center',
        animation: 'word',
        quality: '1080p',
        aspectRatio: '16:9',
      }),
    ).toBe(65);
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
    ).toBe(64);
    expect(
      resolveSubtitleFontSizeMax({
        mode: 'talking-head',
        position: 'bottom',
        animation: 'typewriter',
        quality: '1080p',
        aspectRatio: '16:9',
      }),
    ).toBe(65);
  });

  it('does not apply animation limit for non-restricted animations', () => {
    expect(
      resolveSubtitleFontSizeMax({
        mode: 'talking-head',
        position: 'bottom',
        animation: 'none',
        quality: '1080p',
      }),
    ).toBe(72);
    expect(
      resolveSubtitleFontSizeMax({
        mode: 'talking-head',
        position: 'bottom',
        animation: 'fade',
        quality: '1080p',
      }),
    ).toBe(72);
  });

  it('clamps social-hook word-by-word font size to safe max in portrait', () => {
    expect(
      clampSubtitleFontSize(120, {
        mode: 'general',
        position: 'center',
        animation: 'word',
        quality: '1080p',
        aspectRatio: '9:16',
      }),
    ).toBe(72);
  });

  it('defaults to portrait aspect ratio when not specified for word mode', () => {
    expect(
      resolveSubtitleFontSizeMax({
        mode: 'talking-head',
        position: 'center',
        animation: 'word',
        quality: '1080p',
      }),
    ).toBe(72);
  });

  it('treats viral pop word animation with the same safe font limits as word-by-word', () => {
    expect(
      resolveSubtitleFontSizeMax({
        mode: 'general',
        position: 'center',
        animation: 'pop-word',
        quality: '1080p',
        aspectRatio: '9:16',
      }),
    ).toBe(72);

    expect(
      clampSubtitleFontSize(120, {
        mode: 'general',
        position: 'center',
        animation: 'pop-word',
        quality: '1080p',
        aspectRatio: '9:16',
      }),
    ).toBe(72);
  });

  it('maps small/medium/large presets to proportional font sizes', () => {
    const context = {
      mode: 'talking-head' as const,
      position: 'bottom' as const,
      quality: '1080p' as const,
      aspectRatio: '9:16' as const,
    };

    expect(resolveSubtitleFontSizePresetValue('small', context)).toBe(25);
    expect(resolveSubtitleFontSizePresetValue('medium', context)).toBe(34);
    expect(resolveSubtitleFontSizePresetValue('large', context)).toBe(49);
  });

  it('resolves nearest font size preset from existing px value', () => {
    const context = {
      mode: 'talking-head' as const,
      position: 'bottom' as const,
      quality: '1080p' as const,
      aspectRatio: '9:16' as const,
    };

    expect(resolveSubtitleFontSizePreset(24, context)).toBe('small');
    expect(resolveSubtitleFontSizePreset(40, context)).toBe('medium');
    expect(resolveSubtitleFontSizePreset(63, context)).toBe('large');
  });

  it('keeps preset values clamped under strict word-by-word limits', () => {
    const strictContext = {
      mode: 'general' as const,
      position: 'center' as const,
      animation: 'word' as const,
      quality: '1080p' as const,
      aspectRatio: '9:16' as const,
    };

    expect(resolveSubtitleFontSizePresetValue('small', strictContext)).toBe(33);
    expect(resolveSubtitleFontSizePresetValue('medium', strictContext)).toBe(55);
    expect(resolveSubtitleFontSizePresetValue('large', strictContext)).toBe(71);
  });
});
