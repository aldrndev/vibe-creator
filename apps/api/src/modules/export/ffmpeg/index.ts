/**
 * FFmpeg Module Index
 * Central exports for FFmpeg CLI utilities
 */

export { getFFmpegPath, validateFFmpegVersion } from './ffmpeg-binary';
export {
  validateInputPath,
  validateOutputPath,
  createJobTempDir,
  getAllowlistedDirs,
} from './ffmpeg-path-guard';
export {
  buildTrimCommand,
  buildAudioMixCommand,
  buildEncodeCommand,
  buildMuxCommand,
  buildTextOverlayCommand,
  buildVideoEffectsCommand,
  type FFmpegCommand,
  type Resolution,
  type ExportPreset,
  type VideoEffectsOptions,
} from './ffmpeg-command-builder';
export {
  ProgressParser,
  PhaseAggregator,
  createProgressParser,
  createPhaseAggregator,
  PHASE_WEIGHTS,
  type ProgressUpdate,
  type Phase,
} from './ffmpeg-progress';
export {
  runFFmpeg,
  cancelFFmpeg,
  cleanupTempDir,
  getActiveProcessCount,
  type RunOptions,
} from './ffmpeg-runner';
export {
  FFmpegErrorCode,
  detectError,
  getUserMessage,
  type FFmpegError,
} from './ffmpeg-errors';
