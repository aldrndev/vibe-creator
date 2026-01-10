/**
 * FFmpeg Error Detection and Mapping
 * Maps FFmpeg errors to stable API error codes
 */

export enum FFmpegErrorCode {
  INPUT_NOT_FOUND = 'FFMPEG_INPUT_NOT_FOUND',
  UNSUPPORTED_CODEC = 'FFMPEG_UNSUPPORTED_CODEC',
  DECODE_FAILED = 'FFMPEG_DECODE_FAILED',
  ENCODE_FAILED = 'FFMPEG_ENCODE_FAILED',
  OUT_OF_MEMORY = 'FFMPEG_OUT_OF_MEMORY',
  TIMEOUT = 'FFMPEG_TIMEOUT',
  CANCELLED = 'FFMPEG_CANCELLED',
  INVALID_FILTER = 'FFMPEG_INVALID_FILTER',
  UNKNOWN = 'FFMPEG_UNKNOWN',
}

export interface FFmpegError {
  code: FFmpegErrorCode;
  message: string;
  /** Internal details for logging (not exposed to user) */
  details?: string;
}

/**
 * Error patterns for stderr matching
 */
const ERROR_PATTERNS: Array<{ pattern: RegExp; code: FFmpegErrorCode; message: string }> = [
  {
    pattern: /No such file or directory/i,
    code: FFmpegErrorCode.INPUT_NOT_FOUND,
    message: 'Input file not found',
  },
  {
    pattern: /Invalid data found when processing input/i,
    code: FFmpegErrorCode.DECODE_FAILED,
    message: 'Failed to decode input file',
  },
  {
    pattern: /Unknown encoder|Encoder .* not found/i,
    code: FFmpegErrorCode.UNSUPPORTED_CODEC,
    message: 'Unsupported codec or encoder',
  },
  {
    pattern: /Unknown decoder|Decoder .* not found/i,
    code: FFmpegErrorCode.UNSUPPORTED_CODEC,
    message: 'Unsupported codec or decoder',
  },
  {
    pattern: /Error while decoding/i,
    code: FFmpegErrorCode.DECODE_FAILED,
    message: 'Decoding error',
  },
  {
    pattern: /Error while encoding/i,
    code: FFmpegErrorCode.ENCODE_FAILED,
    message: 'Encoding error',
  },
  {
    pattern: /Cannot allocate memory|Out of memory/i,
    code: FFmpegErrorCode.OUT_OF_MEMORY,
    message: 'Out of memory',
  },
  {
    pattern: /Invalid data found|Invalid argument/i,
    code: FFmpegErrorCode.DECODE_FAILED,
    message: 'Invalid input data',
  },
  {
    pattern: /No such filter|Invalid filter/i,
    code: FFmpegErrorCode.INVALID_FILTER,
    message: 'Invalid video/audio filter',
  },
];

/**
 * Detect FFmpeg error from process exit
 */
export function detectError(
  exitCode: number | null,
  signal: string | null,
  stderr: string
): FFmpegError {
  // Timeout (killed by timeout)
  if (signal === 'SIGKILL' && stderr.includes('timeout')) {
    return {
      code: FFmpegErrorCode.TIMEOUT,
      message: 'FFmpeg process timed out',
      details: stderr.slice(0, 200),
    };
  }
  
  // Cancelled (killed by user)
  if (signal === 'SIGTERM' || signal === 'SIGKILL') {
    return {
      code: FFmpegErrorCode.CANCELLED,
      message: 'Export was cancelled',
    };
  }
  
  // Success
  if (exitCode === 0) {
    return {
      code: FFmpegErrorCode.UNKNOWN,
      message: 'FFmpeg completed successfully',
    };
  }
  
  // Pattern matching on stderr
  for (const { pattern, code, message } of ERROR_PATTERNS) {
    if (pattern.test(stderr)) {
      return {
        code,
        message,
        details: stderr.slice(0, 200),
      };
    }
  }
  
  // Unknown error
  return {
    code: FFmpegErrorCode.UNKNOWN,
    message: 'FFmpeg failed with unknown error',
    details: stderr.slice(0, 200),
  };
}

/**
 * Get user-friendly error message (safe for API responses)
 */
export function getUserMessage(error: FFmpegError): string {
  switch (error.code) {
    case FFmpegErrorCode.INPUT_NOT_FOUND:
      return 'One or more input files could not be found. Please re-upload your media.';
    
    case FFmpegErrorCode.UNSUPPORTED_CODEC:
      return 'The video or audio codec is not supported. Please try a different file.';
    
    case FFmpegErrorCode.DECODE_FAILED:
      return 'Failed to process the input file. The file may be corrupted.';
    
    case FFmpegErrorCode.ENCODE_FAILED:
      return 'Failed to encode the output video. Please try different export settings.';
    
    case FFmpegErrorCode.OUT_OF_MEMORY:
      return 'Export failed due to insufficient memory. Try reducing resolution or duration.';
    
    case FFmpegErrorCode.TIMEOUT:
      return 'Export timed out. Please try a shorter video or lower resolution.';
    
    case FFmpegErrorCode.CANCELLED:
      return 'Export was cancelled.';
    
    case FFmpegErrorCode.INVALID_FILTER:
      return 'Invalid video effect or filter configuration.';
    
    case FFmpegErrorCode.UNKNOWN:
    default:
      return 'An unexpected error occurred during export. Please try again.';
  }
}
