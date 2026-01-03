/**
 * Video Transitions
 * Modeled as first-class timeline entities, not decorations
 */

export type TransitionType =
  | 'fade'
  | 'wipe-left'
  | 'wipe-right'
  | 'wipe-up'
  | 'wipe-down'
  | 'slide-left'
  | 'slide-right'
  | 'dissolve'
  | 'blur';

export type TransitionEasing = 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';

/**
 * Transition entity stored in timeline
 */
export interface Transition {
  id: string;
  type: TransitionType;
  durationMs: number;
  easing: TransitionEasing;
  clipAId: string; // Outgoing clip
  clipBId: string; // Incoming clip
  trackId: string;
}

/**
 * Transition presets for UI
 */
export const TRANSITION_PRESETS: Array<{
  id: TransitionType;
  name: string;
  icon: string;
  defaultDurationMs: number;
}> = [
  { id: 'fade', name: 'Fade', icon: '⚡', defaultDurationMs: 500 },
  { id: 'dissolve', name: 'Dissolve', icon: '✨', defaultDurationMs: 750 },
  { id: 'wipe-left', name: 'Wipe Left', icon: '◀️', defaultDurationMs: 500 },
  { id: 'wipe-right', name: 'Wipe Right', icon: '▶️', defaultDurationMs: 500 },
  { id: 'wipe-up', name: 'Wipe Up', icon: '🔼', defaultDurationMs: 500 },
  { id: 'wipe-down', name: 'Wipe Down', icon: '🔽', defaultDurationMs: 500 },
  { id: 'slide-left', name: 'Slide Left', icon: '⬅️', defaultDurationMs: 400 },
  { id: 'slide-right', name: 'Slide Right', icon: '➡️', defaultDurationMs: 400 },
  { id: 'blur', name: 'Blur', icon: '💨', defaultDurationMs: 600 },
];

/**
 * Speed ramping types
 */
export interface SpeedKeyframe {
  timeMs: number; // Position in clip
  speed: number;  // 0.25 - 4.0
}

/**
 * Speed ramp configuration for a clip
 */
export interface SpeedRamp {
  clipId: string;
  keyframes: SpeedKeyframe[];
  easing: TransitionEasing;
}

/**
 * Speed presets
 */
export const SPEED_PRESETS = [
  { id: 'slow-mo-25', name: '0.25x Slow Motion', speed: 0.25 },
  { id: 'slow-mo-50', name: '0.5x Half Speed', speed: 0.5 },
  { id: 'slow-mo-75', name: '0.75x Slightly Slow', speed: 0.75 },
  { id: 'normal', name: '1x Normal', speed: 1 },
  { id: 'fast-125', name: '1.25x Slightly Fast', speed: 1.25 },
  { id: 'fast-150', name: '1.5x Fast', speed: 1.5 },
  { id: 'fast-200', name: '2x Double Speed', speed: 2 },
  { id: 'fast-400', name: '4x Maximum', speed: 4 },
] as const;

/**
 * Speed limits
 */
export const SPEED_LIMITS = {
  MIN: 0.25,
  MAX: 4.0,
  DEFAULT: 1.0,
} as const;

/**
 * Color grading types
 */
export interface ColorGradingSettings {
  brightness: number;  // -100 to 100
  contrast: number;    // -100 to 100
  saturation: number;  // -100 to 100
  temperature: number; // -100 (cool) to 100 (warm)
  tint: number;        // -100 (green) to 100 (magenta)
  shadows: number;     // -100 to 100
  highlights: number;  // -100 to 100
  vibrance: number;    // -100 to 100
}

/**
 * Color grading presets
 */
export const COLOR_PRESETS: Array<{
  id: string;
  name: string;
  settings: ColorGradingSettings;
}> = [
  {
    id: 'none',
    name: 'None',
    settings: {
      brightness: 0,
      contrast: 0,
      saturation: 0,
      temperature: 0,
      tint: 0,
      shadows: 0,
      highlights: 0,
      vibrance: 0,
    },
  },
  {
    id: 'cinematic',
    name: 'Cinematic',
    settings: {
      brightness: -5,
      contrast: 15,
      saturation: -10,
      temperature: 10,
      tint: -5,
      shadows: -20,
      highlights: -10,
      vibrance: 15,
    },
  },
  {
    id: 'vintage',
    name: 'Vintage',
    settings: {
      brightness: 5,
      contrast: -10,
      saturation: -20,
      temperature: 20,
      tint: 10,
      shadows: 10,
      highlights: -15,
      vibrance: -10,
    },
  },
  {
    id: 'vibrant',
    name: 'Vibrant',
    settings: {
      brightness: 5,
      contrast: 10,
      saturation: 30,
      temperature: 5,
      tint: 0,
      shadows: 0,
      highlights: 5,
      vibrance: 40,
    },
  },
  {
    id: 'cool-blue',
    name: 'Cool Blue',
    settings: {
      brightness: 0,
      contrast: 5,
      saturation: 0,
      temperature: -30,
      tint: 0,
      shadows: -10,
      highlights: 10,
      vibrance: 10,
    },
  },
  {
    id: 'warm-sunset',
    name: 'Warm Sunset',
    settings: {
      brightness: 5,
      contrast: 10,
      saturation: 10,
      temperature: 35,
      tint: 5,
      shadows: 5,
      highlights: 10,
      vibrance: 20,
    },
  },
  {
    id: 'black-white',
    name: 'Black & White',
    settings: {
      brightness: 0,
      contrast: 20,
      saturation: -100,
      temperature: 0,
      tint: 0,
      shadows: -10,
      highlights: 10,
      vibrance: 0,
    },
  },
  {
    id: 'sepia',
    name: 'Sepia',
    settings: {
      brightness: 5,
      contrast: 5,
      saturation: -70,
      temperature: 40,
      tint: 15,
      shadows: 10,
      highlights: -5,
      vibrance: 0,
    },
  },
];

/**
 * Default color grading settings
 */
export const DEFAULT_COLOR_GRADING: ColorGradingSettings = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  temperature: 0,
  tint: 0,
  shadows: 0,
  highlights: 0,
  vibrance: 0,
};
