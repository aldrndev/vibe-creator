import { existsSync } from 'node:fs';
import { unlink } from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { env } from '@/config/env';
import { logger } from '@/lib/logger';
import { directorRepo } from './director.repo';

const MEDIA_INPUT_ROOT = resolve(env.MEDIA_INPUT_DIR);

function isWithinMediaRoot(targetPath: string): boolean {
  const relativePath = relative(MEDIA_INPUT_ROOT, targetPath);
  return (
    relativePath !== '' &&
    relativePath !== '..' &&
    !relativePath.startsWith(`..${sep}`) &&
    !isAbsolute(relativePath)
  );
}

/**
 * Resolve a director storage key to a local media path without allowing traversal.
 */
export function resolveDirectorStoragePath(storageKey: string): string {
  const cleanStorageKey = storageKey.replace(/^uploads\//, '');
  const targetPath = resolve(MEDIA_INPUT_ROOT, cleanStorageKey);

  if (!isWithinMediaRoot(targetPath)) {
    throw new Error('Invalid director asset storage path');
  }

  return targetPath;
}

/**
 * Delete a local file if it exists.
 */
export async function unlinkLocalFileIfExists(filePath: string): Promise<boolean> {
  if (!existsSync(filePath)) {
    return false;
  }

  await unlink(filePath);
  return true;
}

/**
 * Delete a director asset file only after all database references are gone.
 */
export async function cleanupDirectorAssetFileIfUnreferenced(storageKey: string): Promise<boolean> {
  try {
    const remainingReferences = await directorRepo.countAssetsByStorageKey(storageKey);
    if (remainingReferences > 0) {
      return false;
    }

    const filePath = resolveDirectorStoragePath(storageKey);
    return await unlinkLocalFileIfExists(filePath);
  } catch (error) {
    logger.warn(
      {
        storageKey,
        error: error instanceof Error ? error.message : String(error),
      },
      'Failed to cleanup director asset file',
    );
    return false;
  }
}
