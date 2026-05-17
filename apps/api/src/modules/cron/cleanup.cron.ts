import { readdir, stat, unlink } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { LifecycleStatus } from '@prisma/client';
import { env } from '@/config/env';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { cleanupDirectorAssetFileIfUnreferenced } from '@/modules/director/asset-file-cleanup';
import {
  getExpiredHardDeleteBefore,
  WORKSPACE_RETENTION_MS,
} from '@/modules/workspace/workspace-lifecycle';

const CLEANUP_DIRS = [
  { dir: 'uploads/temp', maxAgeMs: WORKSPACE_RETENTION_MS.tempUpload, type: 'temp-upload' },
  {
    dir: 'uploads/director/previews',
    maxAgeMs: WORKSPACE_RETENTION_MS.previewCache,
    type: 'director-preview',
  },
  {
    dir: 'uploads/director/clip-previews',
    maxAgeMs: WORKSPACE_RETENTION_MS.previewCache,
    type: 'director-clip-preview',
  },
  {
    dir: 'uploads/director/live-previews',
    maxAgeMs: WORKSPACE_RETENTION_MS.previewCache,
    type: 'director-live-preview',
  },
  { dir: 'uploads/downloads', maxAgeMs: WORKSPACE_RETENTION_MS.exportDownload, type: 'download' },
] as const;

export const cleanupCron = {
  /**
   * Start the cleanup job
   */
  start() {
    logger.info('Starting lifecycle cleanup cron job (1h check interval)');

    // Run immediately on startup (with delay to let app boot)
    setTimeout(() => this.run(), 5000);

    // Run every 1 hour
    setInterval(() => this.run(), 60 * 60 * 1000);
  },

  async run() {
    logger.debug('Running scheduled cleanup...');
    for (const item of CLEANUP_DIRS) {
      await this.cleanDir(join(env.MEDIA_INPUT_DIR, item.dir.replace('uploads/', '')), {
        maxAgeMs: item.maxAgeMs,
        type: item.type,
      });
    }
    await this.markExpiredWorkspaces();
    await this.cleanExpiredDirectorExports();
    await this.cleanExpiredVideoStudioExports();
    await this.hardDeleteExpiredWorkspaces();
  },

  async cleanDir(dirPath: string, options: { maxAgeMs: number; type: string }) {
    try {
      const files = await readdir(dirPath);
      const now = Date.now();
      let count = 0;
      let freedBytes = 0;

      for (const file of files) {
        if (file === '.gitkeep') continue;
        const filePath = join(dirPath, file);
        try {
          const stats = await stat(filePath);
          if (now - stats.mtimeMs > options.maxAgeMs) {
            await unlink(filePath);
            count++;
            freedBytes += stats.size;
          }
        } catch {
          // Ignore file access errors
        }
      }

      if (count > 0) {
        logger.info(
          {
            dir: dirPath,
            type: options.type,
            count,
            freedMB: Math.round(freedBytes / 1024 / 1024),
          },
          'Cleaned up old files',
        );
      }
    } catch {
      // Directory might not exist or other error
      // logger.debug({ dir: dirPath, err }, "Cleanup skip (dir presumably empty/missing)");
    }
  },

  async markExpiredWorkspaces() {
    const now = new Date();
    const activeLegacyCutoff = new Date(now.getTime() - WORKSPACE_RETENTION_MS.activeDraft);
    const completedLegacyCutoff = new Date(now.getTime() - WORKSPACE_RETENTION_MS.completedSession);
    const [projectResult, sessionResult, legacyProjectResult, legacySessionResult] =
      await Promise.all([
        prisma.project.updateMany({
          where: {
            lifecycleStatus: { in: [LifecycleStatus.ACTIVE, LifecycleStatus.COMPLETED] },
            expiresAt: { lt: now },
            deletedAt: null,
          },
          data: { lifecycleStatus: LifecycleStatus.EXPIRED },
        }),
        prisma.directorSession.updateMany({
          where: {
            lifecycleStatus: { in: [LifecycleStatus.ACTIVE, LifecycleStatus.COMPLETED] },
            expiresAt: { lt: now },
            deletedAt: null,
          },
          data: { lifecycleStatus: LifecycleStatus.EXPIRED },
        }),
        prisma.project.updateMany({
          where: {
            deletedAt: null,
            expiresAt: null,
            OR: [
              { lifecycleStatus: LifecycleStatus.ACTIVE, updatedAt: { lt: activeLegacyCutoff } },
              {
                lifecycleStatus: LifecycleStatus.COMPLETED,
                OR: [
                  { completedAt: { lt: completedLegacyCutoff } },
                  { completedAt: null, updatedAt: { lt: completedLegacyCutoff } },
                ],
              },
            ],
          },
          data: { lifecycleStatus: LifecycleStatus.EXPIRED, expiresAt: now },
        }),
        prisma.directorSession.updateMany({
          where: {
            deletedAt: null,
            expiresAt: null,
            OR: [
              { lifecycleStatus: LifecycleStatus.ACTIVE, updatedAt: { lt: activeLegacyCutoff } },
              {
                lifecycleStatus: LifecycleStatus.COMPLETED,
                OR: [
                  { completedAt: { lt: completedLegacyCutoff } },
                  { completedAt: null, updatedAt: { lt: completedLegacyCutoff } },
                ],
              },
            ],
          },
          data: { lifecycleStatus: LifecycleStatus.EXPIRED, expiresAt: now },
        }),
      ]);

    const projectCount = projectResult.count + legacyProjectResult.count;
    const sessionCount = sessionResult.count + legacySessionResult.count;

    if (projectCount > 0 || sessionCount > 0) {
      logger.info(
        {
          projects: projectCount,
          directorSessions: sessionCount,
          type: 'workspace-expiry',
        },
        'Marked expired workspaces',
      );
    }
  },

  async cleanExpiredDirectorExports() {
    const now = new Date();
    const jobs = await prisma.directorExportJob.findMany({
      where: {
        downloadExpiresAt: { lt: now },
        outputDeletedAt: null,
        outputStorageKey: { not: null },
      },
      select: { id: true, outputStorageKey: true },
      take: 100,
    });

    let deletedCount = 0;
    let freedBytes = 0;

    for (const job of jobs) {
      if (!job.outputStorageKey) {
        continue;
      }

      const filePath = join(
        env.MEDIA_INPUT_DIR,
        'director',
        'exports',
        basename(job.outputStorageKey),
      );
      try {
        const stats = await stat(filePath);
        await unlink(filePath);
        deletedCount++;
        freedBytes += stats.size;
      } catch {
        // Missing files are still marked deleted so download state stays consistent.
      }

      await prisma.directorExportJob.update({
        where: { id: job.id },
        data: { outputDeletedAt: now },
      });
    }

    if (jobs.length > 0) {
      logger.info(
        {
          type: 'director-export-output',
          jobs: jobs.length,
          deletedCount,
          freedMB: Math.round(freedBytes / 1024 / 1024),
        },
        'Cleaned expired director export outputs',
      );
    }
  },

  async cleanExpiredVideoStudioExports() {
    const now = new Date();
    const jobs = await prisma.exportHistory.findMany({
      where: {
        status: 'COMPLETED',
        urlExpiresAt: { lt: now },
        localPath: { not: null },
      },
      select: { id: true, localPath: true },
      take: 100,
    });

    let deletedCount = 0;
    let freedBytes = 0;

    for (const job of jobs) {
      if (!job.localPath) {
        continue;
      }

      try {
        const stats = await stat(job.localPath);
        await unlink(job.localPath);
        deletedCount++;
        freedBytes += stats.size;
      } catch {
        // Missing files are still marked so cache/download state is invalidated.
      }

      await prisma.exportHistory.update({
        where: { id: job.id },
        data: {
          localPath: null,
          downloadUrl: null,
          expiresAt: now,
        },
      });
    }

    if (jobs.length > 0) {
      logger.info(
        {
          type: 'video-studio-export-output',
          jobs: jobs.length,
          deletedCount,
          freedMB: Math.round(freedBytes / 1024 / 1024),
        },
        'Cleaned expired Video Studio export outputs',
      );
    }
  },

  async hardDeleteExpiredWorkspaces() {
    const cutoff = getExpiredHardDeleteBefore();
    const projects = await prisma.project.findMany({
      where: {
        OR: [
          { lifecycleStatus: LifecycleStatus.EXPIRED, expiresAt: { lt: cutoff } },
          { lifecycleStatus: LifecycleStatus.DELETED, deletedAt: { lt: cutoff } },
        ],
      },
      select: { id: true },
      take: 100,
    });

    const sessions = await prisma.directorSession.findMany({
      where: {
        OR: [
          { lifecycleStatus: LifecycleStatus.EXPIRED, expiresAt: { lt: cutoff } },
          { lifecycleStatus: LifecycleStatus.DELETED, deletedAt: { lt: cutoff } },
        ],
      },
      include: { asset: { select: { storageKey: true } } },
      take: 100,
    });

    for (const project of projects) {
      await prisma.project.delete({ where: { id: project.id } });
    }

    for (const session of sessions) {
      const storageKey = session.asset?.storageKey ?? null;
      await prisma.directorSession.delete({ where: { id: session.id } });
      if (storageKey) {
        await cleanupDirectorAssetFileIfUnreferenced(storageKey);
      }
    }

    if (projects.length > 0 || sessions.length > 0) {
      logger.info(
        {
          type: 'workspace-hard-delete',
          projects: projects.length,
          directorSessions: sessions.length,
        },
        'Hard-deleted expired workspaces after grace period',
      );
    }
  },
};
