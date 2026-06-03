import type { Dirent } from 'node:fs';
import { readdir, rm, stat } from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { env } from '@/config/env';
import { logger } from '@/lib/logger';

const PROJECT_ASSET_ROOT = resolve(env.MEDIA_INPUT_DIR, 'projects');

/** Result of removing local files owned by one Video Studio project. */
export interface ProjectAssetCleanupResult {
  readonly succeeded: boolean;
  readonly deletedFiles: number;
  readonly freedBytes: number;
}

interface DirectorySize {
  readonly files: number;
  readonly bytes: number;
}

function isWithinProjectAssetRoot(targetPath: string): boolean {
  const relativePath = relative(PROJECT_ASSET_ROOT, targetPath);
  return (
    relativePath !== '' &&
    relativePath !== '..' &&
    !relativePath.startsWith(`..${sep}`) &&
    !isAbsolute(relativePath)
  );
}

function resolveProjectAssetDirectory(projectId: string): string {
  const targetPath = resolve(PROJECT_ASSET_ROOT, projectId);

  if (!isWithinProjectAssetRoot(targetPath)) {
    throw new Error('Invalid project asset storage path');
  }

  return targetPath;
}

function isMissingFileError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 'ENOENT'
  );
}

async function measureDirectory(directoryPath: string): Promise<DirectorySize> {
  let entries: Dirent[];
  try {
    entries = await readdir(directoryPath, { withFileTypes: true });
  } catch (error) {
    if (isMissingFileError(error)) {
      return { files: 0, bytes: 0 };
    }
    throw error;
  }

  let files = 0;
  let bytes = 0;

  for (const entry of entries) {
    const entryPath = resolve(directoryPath, entry.name);
    if (entry.isDirectory()) {
      const child = await measureDirectory(entryPath);
      files += child.files;
      bytes += child.bytes;
      continue;
    }

    if (entry.isFile()) {
      const fileStats = await stat(entryPath);
      files += 1;
      bytes += fileStats.size;
    }
  }

  return { files, bytes };
}

/**
 * Removes local media files owned by a Video Studio project after lifecycle expiry.
 *
 * Missing directories are treated as a successful idempotent cleanup so a prior
 * partial run cannot prevent the project record from being removed later.
 */
export async function cleanupProjectAssetFiles(
  projectId: string,
): Promise<ProjectAssetCleanupResult> {
  try {
    const directoryPath = resolveProjectAssetDirectory(projectId);
    const size = await measureDirectory(directoryPath);
    await rm(directoryPath, { recursive: true, force: true });

    return {
      succeeded: true,
      deletedFiles: size.files,
      freedBytes: size.bytes,
    };
  } catch (error) {
    logger.warn(
      {
        projectId,
        error: error instanceof Error ? error.message : String(error),
      },
      'Failed to cleanup project asset files',
    );
    return { succeeded: false, deletedFiles: 0, freedBytes: 0 };
  }
}
