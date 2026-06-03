import { describe, expect, it } from 'vitest';
import {
  formatPropertyNumber,
  formatPropertyPercent,
  roundPropertyNumber,
} from './property-number';

describe('property number utilities', () => {
  it('formats numbers with at most two decimal places', () => {
    expect(formatPropertyNumber(46.02695167286245)).toBe('46.03');
    expect(formatPropertyNumber(50.3714721189591)).toBe('50.37');
    expect(formatPropertyNumber(100)).toBe('100');
  });

  it('formats opacity as a compact percentage', () => {
    expect(formatPropertyPercent(1)).toBe('100%');
    expect(formatPropertyPercent(0.825)).toBe('82.5%');
    expect(formatPropertyPercent(0.4602695167286245)).toBe('46.03%');
  });

  it('rounds invalid values to a safe fallback', () => {
    expect(roundPropertyNumber(Number.NaN, 12.345)).toBe(12.35);
  });
});
