import type { PaymentStatus, SubscriptionTier } from '@prisma/client';
import { env } from '@/config/env';
import { createCircuitBreaker } from '@/lib/circuit-breaker';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { getExportLimitForTier } from '@/lib/subscription-limits';

// Pricing in IDR
const TIER_PRICES: Record<string, number> = {
  FREE: 0,
  CREATOR: 99000,
  PRO: 199000,
};

interface CreateInvoiceInput {
  userId: string;
  userEmail: string;
  tier: SubscriptionTier;
}

interface XenditInvoice {
  id: string;
  external_id: string;
  invoice_url: string;
  status: string;
  amount: number;
}

interface WebhookPayload {
  id: string;
  external_id: string;
  status: string;
  payment_method?: string;
  paid_at?: string;
}

interface WebhookResult {
  paymentId: string;
  userId: string;
  status: PaymentStatus;
  tier: SubscriptionTier;
}

// Circuit breaker for Xendit API
const xenditBreaker = createCircuitBreaker(
  async (...args: unknown[]): Promise<Response> => {
    const [url, requestInit] = args as [string, RequestInit];
    return fetch(url, requestInit);
  },
  {
    serviceName: 'Xendit Payment',
    timeout: 8000,
    errorThresholdPercentage: 50,
    resetTimeout: 45000,
    allowRetry: false, // Payment operations not idempotent by default
  },
);

/**
 * Payment service for Xendit integration
 */
export const paymentService = {
  /**
   * Create Xendit invoice for subscription upgrade
   */
  async createInvoice(
    input: CreateInvoiceInput,
  ): Promise<{ invoiceUrl: string; paymentId: string }> {
    const { userId, userEmail, tier } = input;

    const amount = TIER_PRICES[tier];
    if (!amount || amount === 0) {
      throw new Error('Invalid tier or free tier selected');
    }

    const externalId = `payment-${userId}-${Date.now()}`;

    // Create payment record
    const payment = await prisma.paymentHistory.create({
      data: {
        userId,
        amount,
        tier,
        status: 'PENDING',
      },
    });

    const xenditSecretKey = env.XENDIT_SECRET_KEY;
    if (!xenditSecretKey) {
      if (env.NODE_ENV !== 'development') {
        throw new Error('XENDIT_SECRET_KEY is not configured');
      }

      logger.warn('XENDIT_SECRET_KEY not configured, using mock invoice');

      await prisma.paymentHistory.update({
        where: { id: payment.id },
        data: { xenditInvoiceId: `mock-${payment.id}` },
      });

      return {
        invoiceUrl: `/payment/mock?paymentId=${payment.id}`,
        paymentId: payment.id,
      };
    }

    // Create Xendit invoice
    const response = await xenditBreaker.fire('https://api.xendit.co/v2/invoices', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${xenditSecretKey}:`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        external_id: externalId,
        amount,
        currency: 'IDR',
        payer_email: userEmail,
        description: `Vibe Creator - ${tier} Subscription`,
        invoice_duration: 86400, // 24 hours
        success_redirect_url: `${env.FRONTEND_URL}/dashboard/pricing?payment=success`,
        failure_redirect_url: `${env.FRONTEND_URL}/dashboard/pricing?payment=failed`,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error({ error }, 'Xendit invoice creation failed');
      throw new Error('Failed to create invoice');
    }

    const invoice = (await response.json()) as XenditInvoice;

    // Update payment with Xendit ID
    await prisma.paymentHistory.update({
      where: { id: payment.id },
      data: { xenditInvoiceId: invoice.id },
    });

    logger.info({ paymentId: payment.id, invoiceId: invoice.id }, 'Invoice created');

    return {
      invoiceUrl: invoice.invoice_url,
      paymentId: payment.id,
    };
  },

  /**
   * Handle Xendit webhook callback
   */
  async handleWebhook(payload: WebhookPayload): Promise<WebhookResult | null> {
    const { id, status, payment_method, paid_at } = payload;

    logger.info({ invoiceId: id, status }, 'Webhook received');

    // Find payment by Xendit invoice ID
    const payment = await prisma.paymentHistory.findFirst({
      where: { xenditInvoiceId: id },
    });

    if (!payment) {
      logger.warn({ invoiceId: id }, 'Payment not found for webhook');
      return null;
    }

    if (status === 'PAID') {
      // Update payment status
      await prisma.paymentHistory.update({
        where: { id: payment.id },
        data: {
          status: 'PAID',
          paymentMethod: payment_method,
          paidAt: paid_at ? new Date(paid_at) : new Date(),
        },
      });

      // Upgrade subscription
      await this.upgradeSubscription(payment.userId, payment.tier);

      logger.info(
        { paymentId: payment.id, tier: payment.tier },
        'Payment successful, subscription upgraded',
      );
      return {
        paymentId: payment.id,
        userId: payment.userId,
        status: 'PAID',
        tier: payment.tier,
      };
    }

    if (status === 'EXPIRED' || status === 'FAILED') {
      const mappedStatus: PaymentStatus = status === 'EXPIRED' ? 'EXPIRED' : 'FAILED';
      await prisma.paymentHistory.update({
        where: { id: payment.id },
        data: { status: mappedStatus },
      });
      return {
        paymentId: payment.id,
        userId: payment.userId,
        status: mappedStatus,
        tier: payment.tier,
      };
    }

    return null;
  },

  /**
   * Upgrade user subscription
   */
  async upgradeSubscription(userId: string, tier: SubscriptionTier): Promise<void> {
    const exportsLimit = getExportLimitForTier(tier);
    const validUntil = new Date();
    validUntil.setMonth(validUntil.getMonth() + 1); // 1 month subscription

    await prisma.subscription.upsert({
      where: { userId },
      create: {
        userId,
        tier,
        status: 'ACTIVE',
        exportsUsed: 0,
        exportsLimit,
        validUntil,
      },
      update: {
        tier,
        status: 'ACTIVE',
        exportsUsed: 0,
        exportsLimit,
        validUntil,
      },
    });
  },

  /**
   * Mock payment confirmation (for development)
   */
  async confirmMockPayment(paymentId: string, userId: string): Promise<void> {
    if (env.NODE_ENV !== 'development') {
      throw new Error('Mock payments are only available in development');
    }

    const payment = await prisma.paymentHistory.findFirst({
      where: { id: paymentId, userId },
    });

    if (!payment) {
      throw new Error('Payment not found');
    }

    await prisma.paymentHistory.update({
      where: { id: payment.id },
      data: {
        status: 'PAID',
        paymentMethod: 'MOCK',
        paidAt: new Date(),
      },
    });

    await this.upgradeSubscription(payment.userId, payment.tier);

    logger.info({ paymentId, tier: payment.tier }, 'Mock payment confirmed');
  },

  /**
   * Get payment history for user
   */
  async getHistory(userId: string, limit = 20) {
    return prisma.paymentHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  },

  /**
   * Get current subscription status
   */
  async getSubscription(userId: string) {
    let subscription = await prisma.subscription.findUnique({
      where: { userId },
    });

    // Create default free subscription if not exists
    if (!subscription) {
      subscription = await prisma.subscription.create({
        data: {
          userId,
          tier: 'FREE',
          status: 'ACTIVE',
          exportsUsed: 0,
          exportsLimit: getExportLimitForTier('FREE'),
        },
      });
    }

    // Check if expired
    if (subscription.validUntil && subscription.validUntil < new Date()) {
      subscription = await prisma.subscription.update({
        where: { userId },
        data: {
          tier: 'FREE',
          status: 'EXPIRED',
          exportsUsed: 0,
          exportsLimit: getExportLimitForTier('FREE'),
          validUntil: null,
        },
      });
    }

    return {
      ...subscription,
      price: TIER_PRICES[subscription.tier],
      isUnlimited: subscription.exportsLimit >= 999999,
    };
  },

  /**
   * Check export quota without consuming it.
   */
  async checkExportQuota(userId: string): Promise<{ allowed: boolean; remaining: number }> {
    const subscription = await this.getSubscription(userId);

    if (subscription.isUnlimited) {
      return { allowed: true, remaining: -1 };
    }

    if (subscription.exportsUsed >= subscription.exportsLimit) {
      return { allowed: false, remaining: 0 };
    }

    return {
      allowed: true,
      remaining: subscription.exportsLimit - subscription.exportsUsed,
    };
  },

  /**
   * Check and increment export count.
   */
  async consumeExportQuota(userId: string): Promise<{ allowed: boolean; remaining: number }> {
    const quota = await this.checkExportQuota(userId);

    if (!quota.allowed || quota.remaining === -1) {
      return quota;
    }

    await prisma.subscription.update({
      where: { userId },
      data: { exportsUsed: { increment: 1 } },
    });

    return {
      allowed: true,
      remaining: Math.max(0, quota.remaining - 1),
    };
  },
};
