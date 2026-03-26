/**
 * FFmpeg Command Builder - Facade
 * Re-exports all builders from organized modules
 */

export { buildAudioMixCommand } from './builders/audio.builder';
export type {
  ExportPreset,
  FFmpegCommand,
  Resolution,
} from './builders/basic.builder';

export {
  buildEncodeCommand,
  buildMuxCommand,
  buildTextOverlayCommand,
  buildTrimCommand,
} from './builders/basic.builder';
export type { VideoEffectsOptions } from './builders/effects.builder';

export { buildVideoEffectsCommand } from './builders/effects.builder';
