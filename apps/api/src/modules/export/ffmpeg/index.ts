/**
 * FFmpeg Module Index
 * Central exports for FFmpeg CLI utilities
 */

export { getFFmpegPath, validateFFmpegVersion } from './ffmpeg-binary';
export {
  buildAudioMixCommand,
  buildEncodeCommand,
  buildMuxCommand,
  buildTextOverlayCommand,
  buildTrimCommand,
  buildVideoEffectsCommand,
  type ExportPreset,
  type FFmpegCommand,
  type Resolution,
  type VideoEffectsOptions,
} from './ffmpeg-command-builder';
export {
  detectError,
  type FFmpegError,
  FFmpegErrorCode,
  getUserMessage,
} from './ffmpeg-errors';
export {
  createJobTempDir,
  getAllowlistedDirs,
  validateInputPath,
  validateOutputPath,
} from './ffmpeg-path-guard';
export {
  createPhaseAggregator,
  createProgressParser,
  PHASE_WEIGHTS,
  type Phase,
  PhaseAggregator,
  ProgressParser,
  type ProgressUpdate,
} from './ffmpeg-progress';
export {
  cancelFFmpeg,
  cleanupTempDir,
  getActiveProcessCount,
  type RunOptions,
  runFFmpeg,
} from './ffmpeg-runner';
