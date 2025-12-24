import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { downloadService } from './download.service';
import { createReadStream, existsSync, statSync } from 'fs';

const createDownloadSchema = z.object({
  url: z.string().url(),
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
          error: { code: 'VALIDATION_ERROR', message: err.errors[0]?.message },
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
      const status = await downloadService.getJobStatus(request.params.jobId, user.id);
      
      if (status.status !== 'COMPLETED' || !status.localPath) {
        return reply.status(400).send({
          success: false,
          error: { code: 'NOT_READY', message: 'Download not completed yet' },
        });
      }

      if (!existsSync(status.localPath)) {
        return reply.status(404).send({
          success: false,
          error: { code: 'FILE_NOT_FOUND', message: 'Downloaded file not found' },
        });
      }

      const stat = statSync(status.localPath);
      const stream = createReadStream(status.localPath);

      return reply
        .header('Content-Type', 'video/mp4')
        .header('Content-Disposition', `attachment; filename="${status.title || 'video'}.mp4"`)
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
   * Get user's download history
   */
  fastify.get('/history', async (request, reply) => {
    const user = request.user;
    if (!user) {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    const history = await downloadService.getHistory(user.id);
    
    return reply.send({
      success: true,
      data: history,
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
