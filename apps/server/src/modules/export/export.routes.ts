import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { exportService } from './export.service';
import { paymentService } from '@/modules/payment/payment.service';
import { createReadStream, existsSync, statSync } from 'fs';

const createExportSchema = z.object({
  projectId: z.string(),
  timelineData: z.object({
    clips: z.array(z.object({
      localPath: z.string(),
      startTime: z.number(),
      endTime: z.number(),
    })),
    settings: z.object({
      width: z.number().default(1920),
      height: z.number().default(1080),
      fps: z.number().default(30),
    }),
  }),
  format: z.enum(['MP4', 'WEBM', 'MOV']).optional().default('MP4'),
  resolution: z.enum(['SD', 'HD', 'UHD']).optional().default('HD'),
  addWatermark: z.boolean().optional().default(true),
});

export const exportRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * Create export job
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
      const body = createExportSchema.parse(request.body);
      
      // Admin bypass - no quota check, no watermark, full resolution
      const isAdmin = user.role === 'ADMIN';
      
      let shouldAddWatermark = body.addWatermark;
      let maxResolution = body.resolution;
      let remaining = -1; // Unlimited for admin
      
      if (!isAdmin) {
        // Check subscription and export quota for non-admin users
        const subscription = await paymentService.getSubscription(user.id);
        const exportResult = await paymentService.useExport(user.id);
        
        if (!exportResult.allowed) {
          return reply.status(403).send({
            success: false,
            error: { 
              code: 'QUOTA_EXCEEDED', 
              message: 'Export quota exceeded. Please upgrade your plan.',
              remaining: 0,
            },
          });
        }
        
        remaining = exportResult.remaining;
        
        // Force watermark for FREE tier
        shouldAddWatermark = subscription.tier === 'FREE' ? true : body.addWatermark;
        
        // Check resolution limits based on tier
        if (subscription.tier === 'FREE' && maxResolution === 'UHD') {
          maxResolution = 'SD'; // Limit to SD for free
        } else if (subscription.tier === 'CREATOR' && maxResolution === 'UHD') {
          maxResolution = 'HD'; // Limit to HD for creator
        }
      }
      
      const job = await exportService.createJob({
        userId: user.id,
        projectId: body.projectId,
        timelineData: body.timelineData,
        format: body.format,
        resolution: maxResolution,
        addWatermark: shouldAddWatermark,
      });

      return reply.status(201).send({
        success: true,
        data: {
          jobId: job.id,
          status: job.status,
          remaining,
          watermarkApplied: shouldAddWatermark,
          isAdmin,
        },
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: err.errors[0]?.message },
        });
      }
      
      const message = err instanceof Error ? err.message : 'Export failed';
      return reply.status(400).send({
        success: false,
        error: { code: 'EXPORT_ERROR', message },
      });
    }
  });

  /**
   * Get export job status
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
      const status = await exportService.getJobStatus(request.params.jobId, user.id);
      
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
   * Download exported video
   */
  fastify.get<{ Params: { jobId: string } }>('/:jobId/download', async (request, reply) => {
    const user = request.user;
    if (!user) {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    try {
      const status = await exportService.getJobStatus(request.params.jobId, user.id);
      
      if (status.status !== 'COMPLETED' || !status.localPath) {
        return reply.status(400).send({
          success: false,
          error: { code: 'NOT_READY', message: 'Export not completed yet' },
        });
      }

      if (!existsSync(status.localPath)) {
        return reply.status(404).send({
          success: false,
          error: { code: 'FILE_NOT_FOUND', message: 'Export file not found' },
        });
      }

      const stat = statSync(status.localPath);
      const stream = createReadStream(status.localPath);

      return reply
        .header('Content-Type', 'video/mp4')
        .header('Content-Disposition', `attachment; filename="export-${request.params.jobId}.mp4"`)
        .header('Content-Length', stat.size)
        .send(stream);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Download failed';
      return reply.status(500).send({
        success: false,
        error: { code: 'DOWNLOAD_ERROR', message },
      });
    }
  });

  /**
   * Get user's export history
   */
  fastify.get('/history', async (request, reply) => {
    const user = request.user;
    if (!user) {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    const history = await exportService.getHistory(user.id);
    
    return reply.send({
      success: true,
      data: history,
    });
  });
};
