import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { paymentService } from './payment.service';

const createInvoiceSchema = z.object({
  tier: z.enum(['CREATOR', 'PRO']),
});

const mockConfirmSchema = z.object({
  paymentId: z.string(),
});

export const paymentRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * Create payment invoice
   */
  fastify.post('/create-invoice', async (request, reply) => {
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

      return reply.send({
        success: true,
        data: result,
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: err.errors[0]?.message },
        });
      }

      const message = err instanceof Error ? err.message : 'Invoice creation failed';
      return reply.status(500).send({
        success: false,
        error: { code: 'PAYMENT_ERROR', message },
      });
    }
  });

  /**
   * Xendit webhook callback
   */
  fastify.post('/webhook', async (request, reply) => {
    // Verify webhook token
    const webhookToken = process.env.XENDIT_WEBHOOK_TOKEN;
    const headerToken = request.headers['x-callback-token'];

    if (webhookToken && headerToken !== webhookToken) {
      return reply.status(401).send({
        success: false,
        error: { code: 'INVALID_TOKEN', message: 'Invalid webhook token' },
      });
    }

    try {
      const payload = request.body as {
        id: string;
        external_id: string;
        status: string;
        payment_method?: string;
        paid_at?: string;
      };

      await paymentService.handleWebhook(payload);

      return reply.send({
        success: true,
        data: { message: 'Webhook processed' },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Webhook processing failed';
      return reply.status(500).send({
        success: false,
        error: { code: 'WEBHOOK_ERROR', message },
      });
    }
  });

  /**
   * Mock payment confirmation (development only)
   */
  fastify.post('/mock-confirm', async (request, reply) => {
    const user = request.user;
    if (!user) {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
      return reply.status(403).send({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Not available in production' },
      });
    }

    try {
      const body = mockConfirmSchema.parse(request.body);
      await paymentService.confirmMockPayment(body.paymentId);

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
  });

  /**
   * Get current subscription
   */
  fastify.get('/subscription', async (request, reply) => {
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
  });

  /**
   * Get payment history
   */
  fastify.get('/history', async (request, reply) => {
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
  });

  /**
   * Use an export (check quota)
   */
  fastify.post('/use-export', async (request, reply) => {
    const user = request.user;
    if (!user) {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    try {
      const result = await paymentService.useExport(user.id);

      if (!result.allowed) {
        return reply.status(403).send({
          success: false,
          error: { code: 'QUOTA_EXCEEDED', message: 'Export quota exceeded. Please upgrade your plan.' },
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
  });
};
