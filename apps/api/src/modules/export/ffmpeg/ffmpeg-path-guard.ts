/**
 * FFmpeg Path Guard
 * Path validation, allowlisting, and SSRF prevention
 */

import { existsSync, mkdirSync, realpathSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { logger } from '@/lib/logger';

// Allowlisted base directories (must match export.service.ts)
const MEDIA_INPUT_DIR = process.env.MEDIA_INPUT_DIR || join(process.cwd(), 'uploads');
const MEDIA_TEMP_DIR = process.env.MEDIA_TEMP_DIR || join(process.cwd(), 'uploads', 'temp');
const MEDIA_OUTPUT_DIR = process.env.MEDIA_OUTPUT_DIR || join(process.cwd(), 'uploads', 'exports');

/**
 * Check if path is within allowed directory
 */
function isPathAllowed(targetPath: string, allowedBase: string): boolean {
  try {
    const resolvedTarget = realpathSync(targetPath);
    const resolvedBase = realpathSync(allowedBase);
    const relativePath = relative(resolvedBase, resolvedTarget);

    // Path is allowed if it doesn't start with '..' (parent directory)
    return !relativePath.startsWith('..') && !resolve(relativePath).startsWith('..');
  } catch {
    return false;
  }
}

/**
 * Detect URL-like patterns (SSRF prevention)
 */
function isUrl(path: string): boolean {
  const urlPatterns = [/^https?:\/\//i, /^ftp:\/\//i, /^file:\/\//i, /^data:/i];

  return urlPatterns.some((pattern) => pattern.test(path));
}

/**
 * Validate input path
 * Throws if: URL, traversal, symlink escape, non-existent
 */
export function validateInputPath(path: string): string {
  // Reject null bytes (poison attack)
  if (path.includes('\x00')) {
    throw new Error('Null bytes not allowed in path');
  }

  // Reject URLs
  if (isUrl(path)) {
    throw new Error('URL inputs not allowed (SSRF protection)');
  }

  // Reject traversal attempts
  if (path.includes('..')) {
    throw new Error('Path traversal not allowed');
  }

  // Check existence
  if (!existsSync(path)) {
    throw new Error(`Input file not found: ${path}`);
  }

  // Resolve to absolute path
  const absolutePath = resolve(path);

  // Check allowlist (must be within MEDIA_INPUT_DIR or MEDIA_TEMP_DIR)
  const allowedInInput = isPathAllowed(absolutePath, MEDIA_INPUT_DIR);
  const allowedInTemp = isPathAllowed(absolutePath, MEDIA_TEMP_DIR);

  if (!allowedInInput && !allowedInTemp) {
    throw new Error('Input path outside allowed directories');
  }

  logger.debug({ path: absolutePath }, 'Validated input path');
  return absolutePath;
}

/**
 * Validate output path
 * Creates parent directories if needed
 */
export function validateOutputPath(path: string): string {
  // Reject null bytes (poison attack)
  if (path.includes('\x00')) {
    throw new Error('Null bytes not allowed in path');
  }

  // Reject URLs
  if (isUrl(path)) {
    throw new Error('URL outputs not allowed');
  }

  // Reject traversal
  if (path.includes('..')) {
    throw new Error('Path traversal not allowed');
  }

  // Resolve to absolute path
  const absolutePath = resolve(path);

  // Ensure base directories exist
  if (!existsSync(MEDIA_OUTPUT_DIR)) {
    mkdirSync(MEDIA_OUTPUT_DIR, { recursive: true });
  }
  if (!existsSync(MEDIA_TEMP_DIR)) {
    mkdirSync(MEDIA_TEMP_DIR, { recursive: true });
  }

  // Check allowlist (must be within MEDIA_OUTPUT_DIR or MEDIA_TEMP_DIR)
  // Use resolve() for comparison since the path may not exist yet
  const resolvedOutputDir = existsSync(MEDIA_OUTPUT_DIR)
    ? realpathSync(MEDIA_OUTPUT_DIR)
    : resolve(MEDIA_OUTPUT_DIR);
  const resolvedTempDir = existsSync(MEDIA_TEMP_DIR)
    ? realpathSync(MEDIA_TEMP_DIR)
    : resolve(MEDIA_TEMP_DIR);

  const allowedInOutput = absolutePath.startsWith(resolvedOutputDir);
  const allowedInTemp = absolutePath.startsWith(resolvedTempDir);

  if (!allowedInOutput && !allowedInTemp) {
    throw new Error('Output path outside allowed directories');
  }

  // Create parent directory if it doesn't exist
  const parentDir = resolve(absolutePath, '..');
  if (!existsSync(parentDir)) {
    mkdirSync(parentDir, { recursive: true });
  }

  logger.debug({ path: absolutePath }, 'Validated output path');
  return absolutePath;
}

/**
 * Create isolated temp directory for a job
 */
export function createJobTempDir(jobId: string): string {
  const tempDir = join(MEDIA_TEMP_DIR, `export-${jobId}`);

  // Ensure base temp dir exists
  if (!existsSync(MEDIA_TEMP_DIR)) {
    mkdirSync(MEDIA_TEMP_DIR, { recursive: true });
  }

  // Create job-specific temp dir
  if (!existsSync(tempDir)) {
    mkdirSync(tempDir, { recursive: true });
  }

  logger.info({ jobId, tempDir }, 'Created job temp directory');
  return tempDir;
}

/**
 * Get allowlisted directories (for config/logging)
 */
export function getAllowlistedDirs() {
  return {
    input: MEDIA_INPUT_DIR,
    temp: MEDIA_TEMP_DIR,
    output: MEDIA_OUTPUT_DIR,
  };
}
