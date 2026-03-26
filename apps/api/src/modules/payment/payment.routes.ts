import { ERROR_CODES } from '@vibe-creator/shared';
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { env } from '@/config/env';
import { AuditAction, audit } from '@/lib/audit';
import { requireRateLimitReady } from '@/lib/rate-limit';
import { requireAuth } from '@/plugins/auth';
import { sendError } from '@/utils/response';
import { assertValidWebhook } from '@/utils/webhook';
import { paymentService } from './payment.service';

const createInvoiceSchema = z.object({
  tier: z.enum(['CREATOR', 'PRO']),
});

const mockConfirmSchema = z.object({
  paymentId: z.string(),
});

export const paymentRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', async (request, reply) => {
    const result = requireRateLimitReady(request, reply);
    if (result) {
      return result;
    }
  });
  /**
   * Create payment invoice
   */
  fastify.post(
    '/create-invoice',
    {
      preHandler: [requireAuth],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user;
      if (!user) {
        return reply.status(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      try {
        const body = createInvoiceSchema.parse(request.body);
        const result = await paymentService.createInvoice({
          userId: user.id,
          userEmail: user.email,
          tier: body.tier,
        });

        void audit({
          requestId: request.id,
          userId: user.id,
          tenantId: user.id,
          action: AuditAction.PAYMENT_CREATED,
          resourceType: 'payment',
          resourceId: result.paymentId,
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'] ?? undefined,
          metadata: { tier: body.tier },
        });

        return reply.send({
          success: true,
          data: result,
        });
      } catch (err) {
        if (err instanceof z.ZodError) {
          return reply.status(400).send({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: err.issues[0]?.message,
            },
          });
        }
        return reply.status(500).send({
          success: false,
          error: { code: 'PAYMENT_ERROR', message: 'Invoice creation failed' },
        });
      }
    },
  );

  /**
   * Xendit webhook callback
   */
  fastify.post(
    '/webhook',
    { config: { rawBody: true } },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const webhookToken = env.XENDIT_WEBHOOK_TOKEN;
      if (!webhookToken) {
        return sendError(reply, ERROR_CODES.SERVICE_UNAVAILABLE, 'Webhook secret unavailable', 503);
      }

      const headerToken = request.headers['x-callback-token'];
      if (!headerToken || headerToken !== webhookToken) {
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

      try {
        const payload = request.body as {
          id: string;
          external_id: string;
          status: string;
          payment_method?: string;
          paid_at?: string;
        };

        const result = await paymentService.handleWebhook(payload);

        if (result) {
          void audit({
            requestId: request.id,
            userId: result.userId,
            tenantId: result.userId,
            action: AuditAction.PAYMENT_UPDATED,
            resourceType: 'payment',
            resourceId: result.paymentId,
            ipAddress: request.ip,
            userAgent: request.headers['user-agent'] ?? undefined,
            metadata: { status: result.status, tier: result.tier },
          });

          if (result.status === 'PAID') {
            void audit({
              requestId: request.id,
              userId: result.userId,
              tenantId: result.userId,
              action: AuditAction.SUBSCRIPTION_CHANGED,
              resourceType: 'subscription',
              resourceId: result.userId,
              ipAddress: request.ip,
              userAgent: request.headers['user-agent'] ?? undefined,
              metadata: { tier: result.tier },
            });
          }
        }

        return reply.send({
          success: true,
          data: { message: 'Webhook processed' },
        });
      } catch (_err) {
        return sendError(reply, ERROR_CODES.INTERNAL_ERROR, 'Webhook processing failed', 500);
      }
    },
  );

  /**
   * Mock payment confirmation (development only)
   */
  fastify.post(
    '/mock-confirm',
    {
      preHandler: [requireAuth],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user;
      if (!user) {
        return reply.status(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      // Only allow in development
      if (env.NODE_ENV !== 'development') {
        return reply.status(403).send({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Not available outside development' },
        });
      }

      try {
        const body = mockConfirmSchema.parse(request.body);
        await paymentService.confirmMockPayment(body.paymentId, user.id);

        return reply.send({
          success: true,
          data: { message: 'Mock payment confirmed' },
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Mock confirmation failed';
        return reply.status(500).send({
          success: false,
          error: { code: 'PAYMENT_ERROR', message },
        });
      }
    },
  );

  /**
   * Get current subscription
   */
  fastify.get(
    '/subscription',
    {
      preHandler: [requireAuth],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user;
      if (!user) {
        return reply.status(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      try {
        const subscription = await paymentService.getSubscription(user.id);

        return reply.send({
          success: true,
          data: subscription,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to get subscription';
        return reply.status(500).send({
          success: false,
          error: { code: 'SUBSCRIPTION_ERROR', message },
        });
      }
    },
  );

  /**
   * Get payment history
   */
  fastify.get(
    '/history',
    {
      preHandler: [requireAuth],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user;
      if (!user) {
        return reply.status(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      try {
        const history = await paymentService.getHistory(user.id);

        return reply.send({
          success: true,
          data: { payments: history },
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to get payment history';
        return reply.status(500).send({
          success: false,
          error: { code: 'PAYMENT_ERROR', message },
        });
      }
    },
  );

  /**
   * Use an export (check quota)
   */
  fastify.post(
    '/use-export',
    {
      preHandler: [requireAuth],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user;
      if (!user) {
        return reply.status(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      try {
        const result = await paymentService.consumeExportQuota(user.id);

        if (!result.allowed) {
          return reply.status(403).send({
            success: false,
            error: {
              code: 'QUOTA_EXCEEDED',
              message: 'Export quota exceeded. Please upgrade your plan.',
            },
          });
        }

        return reply.send({
          success: true,
          data: result,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to use export';
        return reply.status(500).send({
          success: false,
          error: { code: 'EXPORT_ERROR', message },
        });
      }
    },
  );
};
