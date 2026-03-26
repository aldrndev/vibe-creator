import { existsSync, realpathSync } from 'node:fs';
import { extname, relative, resolve } from 'node:path';
import { env } from '@/config/env';

const TEMP_UPLOAD_DIR = resolve(env.MEDIA_INPUT_DIR, 'temp');
const ALLOWED_VIDEO_EXTENSIONS = new Set(['.mp4', '.m4v', '.mov', '.qt', '.webm']);
const TEMP_UPLOAD_TOKEN_PATTERN = /^[a-f0-9-]+\.(mp4|m4v|mov|qt|webm)$/i;

function isUrlLike(value: string): boolean {
  return /^(https?|ftp|file|data):/i.test(value);
}

function isWithinBase(targetPath: string, basePath: string): boolean {
  const relativePath = relative(basePath, targetPath);
  return relativePath !== '..' && !relativePath.startsWith(`..${'/'}`) && relativePath !== '';
}

export function validateTempUploadPath(inputPath: string): string {
  if (inputPath.includes('\0')) {
    throw new Error('Invalid upload path');
  }

  if (isUrlLike(inputPath)) {
    throw new Error('Upload path must be a local file');
  }

  if (!existsSync(inputPath)) {
    throw new Error('Uploaded file not found');
  }

  const resolvedPath = realpathSync(inputPath);
  const resolvedBase = existsSync(TEMP_UPLOAD_DIR)
    ? realpathSync(TEMP_UPLOAD_DIR)
    : TEMP_UPLOAD_DIR;

  if (!isWithinBase(resolvedPath, resolvedBase)) {
    throw new Error('Upload path is outside the allowed temp directory');
  }

  if (!ALLOWED_VIDEO_EXTENSIONS.has(extname(resolvedPath).toLowerCase())) {
    throw new Error('Unsupported uploaded file type');
  }

  return resolvedPath;
}

export function isTempUploadToken(value: string): boolean {
  return TEMP_UPLOAD_TOKEN_PATTERN.test(value);
}

export function resolveTempUploadToken(uploadToken: string): string {
  if (!isTempUploadToken(uploadToken)) {
    throw new Error('Invalid upload token');
  }

  return validateTempUploadPath(resolve(TEMP_UPLOAD_DIR, uploadToken));
}

export function resolveTempUploadReference(reference: string): string {
  return isTempUploadToken(reference)
    ? resolveTempUploadToken(reference)
    : validateTempUploadPath(reference);
}
