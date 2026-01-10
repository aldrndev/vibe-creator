/**
 * FFmpeg Command Builder - Facade
 * Re-exports all builders from organized modules
 */

export type {
  FFmpegCommand,
  Resolution,
  ExportPreset,
} from "./builders/basic.builder";
export type { VideoEffectsOptions } from "./builders/effects.builder";

export {
  buildTrimCommand,
  buildEncodeCommand,
  buildMuxCommand,
  buildTextOverlayCommand,
} from "./builders/basic.builder";

export { buildAudioMixCommand } from "./builders/audio.builder";

export { buildVideoEffectsCommand } from "./builders/effects.builder";
