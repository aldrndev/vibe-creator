import { prisma } from "../../lib/prisma";
import { logger } from "../../lib/logger";
import crypto from "crypto";
import { Xendit } from "xendit-node";

// Constants
const XENDIT_SECRET_KEY =
  process.env.XENDIT_SECRET_KEY || "xnd_development_..."; // Fallback for dev
const XENDIT_CALLBACK_TOKEN = process.env.XENDIT_CALLBACK_TOKEN || "";

const xendit = new Xendit({ secretKey: XENDIT_SECRET_KEY });
const { Invoice } = xendit;

export const STREAM_PACKAGES = [
  { id: "1h", minutes: 60, price: 10000, name: "1 Jam Stream" },
  { id: "3h", minutes: 180, price: 25000, name: "3 Jam Stream (Hemat)" },
  { id: "10h", minutes: 600, price: 75000, name: "10 Jam Stream (Pro)" },
  { id: "24h", minutes: 1440, price: 150000, name: "24 Jam Stream (Ultra)" },
];

export const billingService = {
  /**
   * Verify Xendit Webhook Token
   */
  verifySignature(token: string): boolean {
    if (!XENDIT_CALLBACK_TOKEN) return true; // Skip if not set in dev
    return token === XENDIT_CALLBACK_TOKEN;
  },

  /**
   * Create Active Invoice for Topup
   */
  async createTopupInvoice(userId: string, packageId: string) {
    const pack = STREAM_PACKAGES.find((p) => p.id === packageId);
    if (!pack) throw new Error("Invalid package");

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("User not found");

    // 1. Create Pending Purchase Record
    // We generate a temp ID or use cuid
    const purchaseId = crypto.randomUUID();
    const externalId = `topup_${purchaseId}`;

    await prisma.streamTopupPurchase.create({
      data: {
        id: purchaseId, // Use our UUID
        userId,
        provider: "XENDIT",
        providerPaymentId: `PENDING_${externalId}`, // Temporary until Xendit returns ID
        minutes: pack.minutes,
        amount: pack.price,
        status: "PENDING",
      },
    });

    // 2. Call Xendit API
    const invoice = await Invoice.createInvoice({
      data: {
        externalId: externalId,
        amount: pack.price,
        description: `Topup Quota Streaming: ${pack.name}`,
        payerEmail: user.email,
        customer: {
          email: user.email,
          givenNames: user.name,
        },
        invoiceDuration: 86400, // 24 hours
        successRedirectUrl: `${
          process.env.APP_URL || "http://localhost:5173"
        }/tools/live-stream`,
        failureRedirectUrl: `${
          process.env.APP_URL || "http://localhost:5173"
        }/tools/live-stream?status=failed`,
        currency: "IDR",
      },
    });

    // 3. Update with real Xendit Invoice ID
    await prisma.streamTopupPurchase.update({
      where: { id: purchaseId },
      data: {
        providerPaymentId: invoice.id,
        // status is still PENDING
      },
    });

    return {
      purchaseId,
      invoiceUrl: invoice.invoiceUrl,
      expiryDate: invoice.expiryDate,
    };
  },

  /**
   * Handle Xendit Webhook
   */
  async handleWebhook(event: Record<string, unknown>) {
    const status = typeof event.status === "string" ? event.status : "";
    const external_id =
      typeof event.external_id === "string" ? event.external_id : "";
    const eventId =
      typeof event.id === "string"
        ? event.id
        : `evt_${Date.now()}_${Math.random()}`;

    // We only care about PAID invoices
    if (status !== "PAID") return;

    // Check if it's a Topup (prefix check or DB lookup)
    // external_id is `topup_{purchaseId}`
    if (!external_id.startsWith("topup_")) return;

    const purchaseId = external_id.replace("topup_", "");

    // Idempotency: Create PaymentEvent record
    try {
      await prisma.paymentEvent.create({
        data: {
          provider: "XENDIT",
          providerEventId: eventId,
          eventType: "invoice.paid",
          payload: event as Record<string, unknown> & object,
        },
      });
    } catch (err) {
      // If duplicate event, ignore but continue checks (or return if strict)
      // Usually strict return if event already processed
      logger.warn({ err }, "Duplicate payment event or error recording");
      const exists = await prisma.paymentEvent.findUnique({
        where: { providerEventId: eventId },
      });
      if (exists) return; // Already processed
    }

    // Process Purchase
    const purchase = await prisma.streamTopupPurchase.findUnique({
      where: { id: purchaseId },
    });
    if (!purchase) {
      logger.error({ purchaseId }, "Purchase not found for paid invoice");
      return;
    }

    if (purchase.status === "PAID") return; // Already paid

    // Apply Topup
    await this.applyTopUp(purchase.id);
  },

  /**
   * Get Active Subscription
   */
  async getSubscription(userId: string) {
    return prisma.billingSubscription.findUnique({
      where: { userId },
    });
  },

  /**
   * Get or Create Open Quota Cycle for User
   */
  async getOrCreateOpenCycle(userId: string) {
    const now = new Date();

    // 1. Try to find open cycle covering NOW
    const activeCycle = await prisma.streamQuotaCycle.findFirst({
      where: {
        userId,
        status: "OPEN",
        cycleStartAt: { lte: now },
        cycleEndAt: { gt: now },
      },
    });

    if (activeCycle) return activeCycle;

    // 2. If no active cycle, check subscription to define boundaries
    const sub = await prisma.billingSubscription.findUnique({
      where: { userId },
    });

    // Default to Monthly Cycle if no sub (Free Tier fallback logic)
    let start = new Date(now.getFullYear(), now.getMonth(), 1);
    let end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    let baseQuota = 300; // Free default

    if (sub && sub.status === "ACTIVE") {
      start = sub.currentPeriodStartAt;
      end = sub.currentPeriodEndAt;
      if (sub.planKey === "PRO") baseQuota = 10000;
      else if (sub.planKey === "CREATOR") baseQuota = 3000;
    }

    // 3. Create Cycle (Atomic with unique constraint handling)
    try {
      return await prisma.streamQuotaCycle.upsert({
        where: {
          userId_cycleStartAt_cycleEndAt: {
            userId,
            cycleStartAt: start,
            cycleEndAt: end,
          },
        },
        update: {},
        create: {
          userId,
          cycleStartAt: start,
          cycleEndAt: end,
          quotaMinutesBase: baseQuota,
          status: "OPEN",
        },
      });
    } catch (err) {
      logger.warn(
        { err, userId },
        "Race condition in getOrCreateOpenCycle, retrying fetch"
      );
      const retryCycle = await prisma.streamQuotaCycle.findFirst({
        where: {
          userId,
          cycleStartAt: start,
          cycleEndAt: end,
        },
      });
      if (!retryCycle) throw new Error("Failed to create quota cycle");
      return retryCycle;
    }
  },

  /**
   * Apply Top Up to current open cycle
   */
  async applyTopUp(purchaseId: string) {
    // Transactional apply
    return await prisma.$transaction(async (tx) => {
      const purchase = await tx.streamTopupPurchase.findUnique({
        where: { id: purchaseId },
      });

      if (!purchase || purchase.status === "PAID") {
        // Already paid or invalid, verify logic
        // If status is PAID, we might be reapplying?
        // Logic: Check if appliedToQuotaCycleId is set.
      }
      if (purchase?.appliedToQuotaCycleId) return;

      const now = new Date();

      // Find or Create Cycle explicitly inside TX to ensure lock/consistency
      // We replicate getOrCreate logic minimally or assume it exists.
      // Ideally we call the function but it's outside TX context unless passed.
      // For simplicity: Find OPEN cycle.
      let cycle = await tx.streamQuotaCycle.findFirst({
        where: {
          userId: purchase!.userId,
          status: "OPEN",
          cycleStartAt: { lte: now },
          cycleEndAt: { gt: now },
        },
      });

      if (!cycle) {
        // Create if missing (fallback)
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        cycle = await tx.streamQuotaCycle.create({
          data: {
            userId: purchase!.userId,
            cycleStartAt: start,
            cycleEndAt: end,
            quotaMinutesBase: 300, // Safe default
            status: "OPEN",
          },
        });
      }

      // Apply
      await tx.streamQuotaCycle.update({
        where: { id: cycle.id },
        data: {
          quotaMinutesTopup: { increment: purchase!.minutes },
        },
      });

      await tx.streamTopupPurchase.update({
        where: { id: purchaseId },
        data: {
          status: "PAID", // Mark as PAID and APPLIED together
          appliedToQuotaCycleId: cycle.id,
        },
      });

      logger.info(
        { userId: purchase!.userId, minutes: purchase!.minutes },
        "Top-up applied to cycle"
      );
    });
  },
};
