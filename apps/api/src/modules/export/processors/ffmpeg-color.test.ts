import { describe, expect, it } from 'vitest';
import { toFFmpegColor } from './ffmpeg-color';

describe('ffmpeg color normalization', () => {
  it('normalizes hex colors', () => {
    expect(toFFmpegColor('#ffffff', 'white')).toBe('0xffffff');
    expect(toFFmpegColor('#0f0', 'white')).toBe('0x00ff00');
  });

  it('normalizes rgba colors with alpha', () => {
    expect(toFFmpegColor('rgba(15, 23, 42, 0.74)', 'black', 0.7)).toBe('0x0f172a@0.74');
  });

  it('applies default alpha for background hex colors', () => {
    expect(toFFmpegColor('#000000', 'black', 0.7)).toBe('0x000000@0.7');
  });
});
