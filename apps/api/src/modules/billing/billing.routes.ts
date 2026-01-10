import { FastifyPluginAsync } from "fastify";
import { billingService, STREAM_PACKAGES } from "./billing.service";
import {
  getQuotaRouteSchema,
  getPackagesRouteSchema,
  createTopupRouteSchema,
  webhookRouteSchema,
} from "./billing.schemas";

export const billingRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * Get Quota Information
   */
  fastify.get(
    "/quota",
    {
      schema: getQuotaRouteSchema,
    },
    async (request, reply) => {
      const user = request.user;
      if (!user) return reply.status(401).send({ error: "Unauthorized" });

      try {
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
            cycleEnd: cycle.cycleEndAt,
          },
        });
      } catch (e) {
        return reply
          .status(500)
          .send({ error: e instanceof Error ? e.message : "Error" });
      }
    }
  );

  /**
   * Get Available Packages
   */
  fastify.get(
    "/packages",
    {
      schema: getPackagesRouteSchema,
    },
    async (_request, reply) => {
      return reply.send({
        success: true,
        data: STREAM_PACKAGES,
      });
    }
  );

  /**
   * Request Topup Invoice
   */
  fastify.post<{ Body: { packageId: string } }>(
    "/topup",
    {
      schema: createTopupRouteSchema,
    },
    async (request, reply) => {
      const user = request.user;
      if (!user) return reply.status(401).send({ error: "Unauthorized" });

      const { packageId } = request.body;
      if (!packageId)
        return reply.status(400).send({ error: "Package ID required" });

      try {
        const result = await billingService.createTopupInvoice(
          user.id,
          packageId
        );
        return reply.send({
          success: true,
          data: result,
        });
      } catch (e) {
        request.log.error(e);
        return reply.status(500).send({
          error: e instanceof Error ? e.message : "Topup creation failed",
        });
      }
    }
  );

  /**
   * Xendit Webhook
   * Public endpoint, requires signature verification
   */
  fastify.post(
    "/webhook",
    {
      schema: webhookRouteSchema,
    },
    async (request, reply) => {
      const token = request.headers["x-callback-token"] as string;
      const isValid = billingService.verifySignature(token);

      if (!isValid) {
        return reply.status(403).send({ error: "Invalid signature" });
      }

      try {
        // Process async to avoid timeout, or sync if critical
        await billingService.handleWebhook(
          request.body as Record<string, unknown>
        );
        return reply.send({ success: true });
      } catch (e) {
        request.log.error(e);
        return reply.status(500).send({ error: "Webhook processing failed" });
      }
    }
  );
};
