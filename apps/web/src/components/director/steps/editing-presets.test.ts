import { describe, expect, it } from 'vitest';
import { subtitlePresets } from '@/components/director/steps/editing-presets';
import { clampSubtitleFontSize, resolveSubtitleFontSizeMax } from '@/lib/director-subtitle-style';

describe('AI Director subtitle presets', () => {
  it('ships Viral Pop as a complete modern preset with safe font clamping', () => {
    const viralPop = subtitlePresets.find((preset) => preset.id === 'viral-pop');

    expect(viralPop?.subtitleStyle).toMatchObject({
      stylePreset: 'viral-pop',
      fontToken: 'F_DISPLAY',
      fontSize: 52,
      textColorToken: 'C_YELLOW',
      bgColorToken: 'BG_TRANSPARENT',
      position: 'center',
      animation: 'pop-word',
    });

    const context = {
      mode: 'general' as const,
      position: viralPop?.subtitleStyle.position,
      animation: viralPop?.subtitleStyle.animation,
      quality: '1080p' as const,
      aspectRatio: '9:16' as const,
    };

    expect(resolveSubtitleFontSizeMax(context)).toBe(72);
    expect(clampSubtitleFontSize(viralPop?.subtitleStyle.fontSize ?? 0, context)).toBe(52);
  });

  it('ships Meme Pop as a neon green outline preset', () => {
    const memePop = subtitlePresets.find((preset) => preset.id === 'meme-pop');

    expect(memePop?.subtitleStyle).toMatchObject({
      stylePreset: 'meme-pop',
      fontToken: 'F_MEME',
      fontSize: 52,
      textColorToken: 'C_GREEN',
      bgColorToken: 'BG_TRANSPARENT',
      position: 'center',
      animation: 'pop-word',
    });
  });
});
