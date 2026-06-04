import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '@/plugins/auth';
import { dashboardService } from './dashboard.service';

const INVALID_DASHBOARD_SUMMARY_MESSAGE = 'Dashboard response tidak valid.';

export const dashboardRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    '/summary',
    {
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      const user = request.user;
      if (!user) {
        return reply.status(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      try {
        const data = await dashboardService.getSummary({
          userId: user.id,
          userRole: user.role,
        });

        return reply.send({ success: true, data });
      } catch (error) {
        if (error instanceof z.ZodError) {
          request.log.error({ issues: error.issues }, 'Invalid dashboard summary payload');
          return reply.status(500).send({
            success: false,
            error: {
              code: 'DASHBOARD_SUMMARY_INVALID',
              message: INVALID_DASHBOARD_SUMMARY_MESSAGE,
            },
          });
        }

        request.log.error({ error }, 'Failed to load dashboard summary');
        return reply.status(500).send({
          success: false,
          error: {
            code: 'DASHBOARD_SUMMARY_FAILED',
            message: 'Dashboard belum bisa dimuat.',
          },
        });
      }
    },
  );
};
