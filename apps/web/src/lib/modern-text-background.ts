import type { TextLayerData } from '@vibe-creator/shared';

export const TEXT_BACKGROUND_DEFAULT_OPACITY = 0.72;
export const TEXT_BACKGROUND_OPACITY_PRESETS = [
  { label: 'Soft', value: 0.35 },
  { label: 'Medium', value: 0.6 },
  { label: 'Strong', value: 0.82 },
] as const;

const RGB_COLOR_PATTERN =
  /^rgba?\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)(?:\s*,\s*([0-9.]+)\s*)?\)$/i;
const HEX_COLOR_PATTERN = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

interface ResolvedTextBackground {
  color?: string;
  opacity?: number;
  cssColor?: string;
}

function clampOpacity(value: number | undefined): number | undefined {
  if (value === undefined || !Number.isFinite(value)) {
    return undefined;
  }

  return Math.max(0, Math.min(1, value));
}

function channelToHex(value: string): string {
  return Math.round(Math.max(0, Math.min(255, Number.parseFloat(value))))
    .toString(16)
    .padStart(2, '0');
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

export function normalizeTextBackgroundColor(
  color: string | undefined,
  opacity: number | undefined,
): ResolvedTextBackground {
  const trimmed = color?.trim();
  if (!trimmed) {
    return {};
  }

  const rgbMatch = trimmed.match(RGB_COLOR_PATTERN);
  if (rgbMatch?.[1] && rgbMatch[2] && rgbMatch[3]) {
    const alpha = clampOpacity(rgbMatch[4] ? Number.parseFloat(rgbMatch[4]) : opacity);
    const hex = `#${channelToHex(rgbMatch[1])}${channelToHex(rgbMatch[2])}${channelToHex(
      rgbMatch[3],
    )}`;
    return {
      color: hex,
      opacity: alpha ?? TEXT_BACKGROUND_DEFAULT_OPACITY,
      cssColor: `rgba(${Number.parseFloat(rgbMatch[1])}, ${Number.parseFloat(
        rgbMatch[2],
      )}, ${Number.parseFloat(rgbMatch[3])}, ${alpha ?? TEXT_BACKGROUND_DEFAULT_OPACITY})`,
    };
  }

  const hexMatch = trimmed.match(HEX_COLOR_PATTERN);
  const normalizedColor = hexMatch?.[1] ? `#${expandHex(hexMatch[1]).toLowerCase()}` : trimmed;
  const resolvedOpacity = clampOpacity(opacity) ?? TEXT_BACKGROUND_DEFAULT_OPACITY;
  const cssColor = hexMatch?.[1]
    ? `${normalizedColor}${Math.round(resolvedOpacity * 255)
        .toString(16)
        .padStart(2, '0')}`
    : normalizedColor;

  return {
    color: normalizedColor,
    opacity: resolvedOpacity,
    cssColor,
  };
}

export function resolveTextBackground(data: TextLayerData): ResolvedTextBackground {
  return normalizeTextBackgroundColor(data.backgroundColor, data.backgroundOpacity);
}

export function createTextBackgroundData(
  color: string | undefined,
  opacity = TEXT_BACKGROUND_DEFAULT_OPACITY,
): Pick<TextLayerData, 'backgroundColor' | 'backgroundOpacity'> {
  if (!color) {
    return {
      backgroundColor: undefined,
      backgroundOpacity: undefined,
    };
  }

  const normalized = normalizeTextBackgroundColor(color, opacity);

  return {
    backgroundColor: normalized.color,
    backgroundOpacity: normalized.opacity ?? TEXT_BACKGROUND_DEFAULT_OPACITY,
  };
}
