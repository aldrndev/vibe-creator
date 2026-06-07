import { ERROR_CODES } from '@vibe-creator/shared';
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { env } from '@/config/env';
import { requireRateLimitReady } from '@/lib/rate-limit';
import { requireAuth } from '@/plugins/auth';
import { sendError } from '@/utils/response';
import { assertValidWebhook } from '@/utils/webhook';
import {
  createTopupRouteSchema,
  getPackagesRouteSchema,
  getQuotaRouteSchema,
  webhookRouteSchema,
} from './billing.schemas';
import { billingService, STREAM_PACKAGES } from './billing.service';

async function verifyWebhookRequest(
  request: FastifyRequest,
  reply: FastifyReply,
  webhookToken: string,
): Promise<FastifyReply | undefined> {
  const headerToken = request.headers['x-callback-token'];
  if (!billingService.verifySignature(typeof headerToken === 'string' ? headerToken : undefined)) {
    return sendError(reply, ERROR_CODES.UNAUTHORIZED, 'Invalid webhook token', 401);
  }

  const signatureHeader = request.headers['x-callback-signature'];
  const timestampHeader = request.headers['x-callback-timestamp'];
  const rawBody = (request as { rawBody?: string }).rawBody;

  if (
    typeof signatureHeader !== 'string' ||
    typeof timestampHeader !== 'string' ||
    typeof rawBody !== 'string'
  ) {
    return sendError(reply, ERROR_CODES.VALIDATION_ERROR, 'Invalid webhook request', 400);
  }

  try {
    await assertValidWebhook({
      secret: webhookToken,
      signature: signatureHeader,
      timestamp: timestampHeader,
      payload: rawBody,
    });
  } catch (err) {
    if (err instanceof Error && err.message === 'Replay protection unavailable') {
      return sendError(
        reply,
        ERROR_CODES.SERVICE_UNAVAILABLE,
        'Webhook replay protection unavailable',
        503,
      );
    }

    return sendError(reply, ERROR_CODES.UNAUTHORIZED, 'Invalid webhook signature', 401);
  }
}

export const billingRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', async (request, reply) => {
    const result = requireRateLimitReady(request, reply);
    if (result) {
      return result;
    }
  });

  /**
   * Get Quota Information
   */
  fastify.get(
    '/quota',
    {
      preHandler: [requireAuth],
      schema: getQuotaRouteSchema,
    },
    async (request, reply) => {
      const user = request.user;
      if (!user) {
        return sendError(reply, ERROR_CODES.UNAUTHORIZED, 'Autentikasi diperlukan', 401);
      }

      try {
        if (user.role === 'ADMIN') {
          return reply.send({
            success: true,
            data: {
              remaining: null,
              total: null,
              used: 0,
              isUnlimited: true,
              cycleEnd: null,
            },
          });
        }

        const cycle = await billingService.getOrCreateOpenCycle(user.id);
        const used = cycle.quotaMinutesUsed;
        const total = cycle.quotaMinutesBase + cycle.quotaMinutesTopup;
        const remaining = Math.max(0, total - used);

        return reply.send({
          success: true,
          data: {
            remaining,
            total,
            used,
            isUnlimited: false,
            cycleEnd: cycle.cycleEndAt,
          },
        });
      } catch (e) {
        return reply.status(500).send({ error: e instanceof Error ? e.message : 'Error' });
      }
    },
  );

  /**
   * Get Available Packages
   */
  fastify.get(
    '/packages',
    {
      schema: getPackagesRouteSchema,
    },
    async (_request, reply) => {
      return reply.send({
        success: true,
        data: STREAM_PACKAGES,
      });
    },
  );

  /**
   * Request Topup Invoice
   */
  fastify.post<{ Body: { packageId: string } }>(
    '/topup',
    {
      preHandler: [requireAuth],
      schema: createTopupRouteSchema,
    },
    async (request, reply) => {
      const user = request.user;
      if (!user) {
        return sendError(reply, ERROR_CODES.UNAUTHORIZED, 'Autentikasi diperlukan', 401);
      }

      const { packageId } = request.body;
      if (!packageId) return reply.status(400).send({ error: 'Package ID required' });

      try {
        const result = await billingService.createTopupInvoice(user.id, packageId);
        return reply.send({
          success: true,
          data: result,
        });
      } catch (e) {
        request.log.error(e);
        return reply.status(500).send({
          error: e instanceof Error ? e.message : 'Topup creation failed',
        });
      }
    },
  );

  /**
   * Xendit Webhook
   * Public endpoint, requires signature verification
   */
  fastify.post(
    '/webhook',
    {
      config: { rawBody: true },
      schema: webhookRouteSchema,
    },
    async (request, reply) => {
      const webhookToken = env.XENDIT_WEBHOOK_TOKEN;
      if (!webhookToken) {
        return sendError(reply, ERROR_CODES.SERVICE_UNAVAILABLE, 'Webhook secret unavailable', 503);
      }

      const verifyResult = await verifyWebhookRequest(request, reply, webhookToken);
      if (verifyResult) {
        return verifyResult;
      }

      try {
        // Process async to avoid timeout, or sync if critical
        await billingService.handleWebhook(request.body as Record<string, unknown>);
        return reply.send({ success: true });
      } catch (e) {
        request.log.error(e);
        return reply.status(500).send({ error: 'Webhook processing failed' });
      }
    },
  );
};
