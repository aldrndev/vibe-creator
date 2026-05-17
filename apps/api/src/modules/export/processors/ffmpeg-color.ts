const HEX_COLOR_PATTERN = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;
const RGB_COLOR_PATTERN =
  /^rgba?\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)(?:\s*,\s*([0-9.]+)\s*)?\)$/i;
const NAMED_COLOR_PATTERN = /^[a-z]+(?:@[0-9.]+)?$/i;

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.max(min, Math.min(max, value));
}

function channelToHex(value: string): string {
  return Math.round(clamp(Number.parseFloat(value), 0, 255))
    .toString(16)
    .padStart(2, '0');
}

function normalizeAlpha(alpha: number): string {
  return clamp(alpha, 0, 1).toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
}

function applyDefaultAlpha(color: string, defaultAlpha?: number): string {
  if (defaultAlpha === undefined || color.includes('@')) {
    return color;
  }

  return `${color}@${normalizeAlpha(defaultAlpha)}`;
}

function expandHex(hex: string): string {
  if (hex.length === 6) {
    return hex;
  }

  return hex
    .split('')
    .map((char) => `${char}${char}`)
    .join('');
}

export function toFFmpegColor(
  color: string | undefined,
  fallback: string,
  defaultAlpha?: number,
): string {
  const trimmed = color?.trim();
  if (!trimmed) {
    return applyDefaultAlpha(fallback, defaultAlpha);
  }

  const hexMatch = trimmed.match(HEX_COLOR_PATTERN);
  if (hexMatch?.[1]) {
    return applyDefaultAlpha(`0x${expandHex(hexMatch[1]).toLowerCase()}`, defaultAlpha);
  }

  const rgbMatch = trimmed.match(RGB_COLOR_PATTERN);
  if (rgbMatch?.[1] && rgbMatch[2] && rgbMatch[3]) {
    const hex = `${channelToHex(rgbMatch[1])}${channelToHex(rgbMatch[2])}${channelToHex(
      rgbMatch[3],
    )}`;
    const alpha = rgbMatch[4] ? Number.parseFloat(rgbMatch[4]) : defaultAlpha;
    return applyDefaultAlpha(`0x${hex}`, alpha);
  }

  if (NAMED_COLOR_PATTERN.test(trimmed)) {
    return applyDefaultAlpha(trimmed.toLowerCase(), defaultAlpha);
  }

  return applyDefaultAlpha(fallback, defaultAlpha);
}
