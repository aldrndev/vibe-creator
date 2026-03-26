import { createReadStream, existsSync, statSync } from 'node:fs';
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { AuditAction, audit } from '@/lib/audit';
import { downloadService } from './download.service';

const createDownloadSchema = z.object({
  url: z.url(),
});

export const downloadRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * Create download job from URL
   */
  fastify.post('/request', async (request, reply) => {
    const user = request.user;
    if (!user) {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    try {
      const body = createDownloadSchema.parse(request.body);

      const job = await downloadService.createJob({
        userId: user.id,
        sourceUrl: body.url,
      });

      return reply.status(201).send({
        success: true,
        data: {
          jobId: job.id,
          status: job.status,
          platform: job.platform,
        },
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: err.issues[0]?.message },
        });
      }

      const message = err instanceof Error ? err.message : 'Download request failed';
      return reply.status(400).send({
        success: false,
        error: { code: 'DOWNLOAD_ERROR', message },
      });
    }
  });

  /**
   * Get download job status
   */
  fastify.get<{ Params: { jobId: string } }>('/:jobId/status', async (request, reply) => {
    const user = request.user;
    if (!user) {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    try {
      const status = await downloadService.getJobStatus(request.params.jobId, user.id);

      return reply.send({
        success: true,
        data: status,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Status check failed';
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message },
      });
    }
  });

  /**
   * Download completed video file
   */
  fastify.get<{ Params: { jobId: string } }>('/:jobId/file', async (request, reply) => {
    const user = request.user;
    if (!user) {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    try {
      const job = await downloadService.getOwnedJob(request.params.jobId, user.id);

      if (job.status !== 'COMPLETED' || !job.localPath) {
        return reply.status(400).send({
          success: false,
          error: { code: 'NOT_READY', message: 'Download not completed yet' },
        });
      }

      if (!existsSync(job.localPath)) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'FILE_NOT_FOUND',
            message: 'Downloaded file not found',
          },
        });
      }

      const stat = statSync(job.localPath);
      const stream = createReadStream(job.localPath);

      return reply
        .header('Content-Type', 'video/mp4')
        .header('Content-Disposition', `attachment; filename="${job.title || 'video'}.mp4"`)
        .header('Content-Length', stat.size)
        .send(stream);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'File download failed';
      return reply.status(500).send({
        success: false,
        error: { code: 'DOWNLOAD_ERROR', message },
      });
    }
  });

  /**
   * Get user's download history with cursor pagination
   */
  fastify.get('/history', async (request, reply) => {
    const user = request.user;
    if (!user) {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    const query = request.query as { limit?: string; cursor?: string };
    const limit = Math.min(parseInt(query.limit || '20', 10), 100);

    const result = await downloadService.getHistory(user.id, limit, query.cursor);

    return reply.send({
      success: true,
      data: result,
    });
  });

  /**
   * Delete a download job
   */
  fastify.delete<{ Params: { jobId: string } }>('/:jobId', async (request, reply) => {
    const user = request.user;
    if (!user) {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    try {
      await downloadService.deleteJob(request.params.jobId, user.id);

      void audit({
        requestId: request.id,
        userId: user.id,
        tenantId: user.id,
        action: AuditAction.RESOURCE_DELETED,
        resourceType: 'download',
        resourceId: request.params.jobId,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'] ?? undefined,
      });

      return reply.send({
        success: true,
        data: { deleted: true },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Delete failed';
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message },
      });
    }
  });
};
