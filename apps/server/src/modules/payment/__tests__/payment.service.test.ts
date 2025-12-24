/**
 * Payment Service Unit Tests
 * 
 * ✅ Happy path
 * ❌ Negative/error cases
 * 🔄 Edge cases
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock modules with vi.hoisted
const { mockPrisma, mockLogger } = vi.hoisted(() => ({
  mockPrisma: {
    paymentHistory: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    subscription: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
    },
  },
  mockLogger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}));

vi.mock('@/lib/logger', () => ({
  logger: mockLogger,
}));

// Mock fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Import after mocks
import { paymentService } from '../payment.service';

// Test data factories
function createMockPayment(overrides = {}) {
  return {
    id: 'pay-123',
    userId: 'user-123',
    amount: 99000,
    tier: 'CREATOR',
    status: 'PENDING',
    xenditInvoiceId: null,
    createdAt: new Date('2024-01-01'),
    ...overrides,
  };
}

function createMockSubscription(overrides = {}) {
  return {
    id: 'sub-123',
    userId: 'user-123',
    tier: 'FREE',
    status: 'ACTIVE',
    exportsUsed: 0,
    exportsLimit: 5,
    validUntil: null,
    ...overrides,
  };
}

describe('paymentService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('XENDIT_SECRET_KEY', ''); // Default: no key (dev mode)
  });

  // ============================================================================
  // createInvoice
  // ============================================================================
  describe('createInvoice', () => {
    it('should create mock invoice in development mode', async () => {
      // Arrange
      const payment = createMockPayment();
      mockPrisma.paymentHistory.create.mockResolvedValue(payment);
      mockPrisma.paymentHistory.update.mockResolvedValue({ ...payment, xenditInvoiceId: 'mock-pay-123' });

      // Act
      const result = await paymentService.createInvoice({
        userId: 'user-123',
        userEmail: 'test@example.com',
        tier: 'CREATOR',
      });

      // Assert
      expect(result.paymentId).toBe('pay-123');
      expect(result.invoiceUrl).toContain('mock');
      expect(mockPrisma.paymentHistory.create).toHaveBeenCalled();
    });

    it('should throw error for FREE tier', async () => {
      // Act & Assert
      await expect(
        paymentService.createInvoice({
          userId: 'user-123',
          userEmail: 'test@example.com',
          tier: 'FREE',
        })
      ).rejects.toThrow('Invalid tier or free tier selected');
    });

    it('should create Xendit invoice when key is configured', async () => {
      // Arrange
      vi.stubEnv('XENDIT_SECRET_KEY', 'test-xendit-key');
      vi.stubEnv('FRONTEND_URL', 'http://localhost:5173');
      
      const payment = createMockPayment();
      mockPrisma.paymentHistory.create.mockResolvedValue(payment);
      mockPrisma.paymentHistory.update.mockResolvedValue(payment);
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          id: 'inv-xendit-123',
          invoice_url: 'https://xendit.co/invoice/xyz',
        }),
      });

      // Act
      const result = await paymentService.createInvoice({
        userId: 'user-123',
        userEmail: 'test@example.com',
        tier: 'PRO',
      });

      // Assert
      expect(result.invoiceUrl).toBe('https://xendit.co/invoice/xyz');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.xendit.co/v2/invoices',
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('should throw error when Xendit API fails', async () => {
      // Arrange
      vi.stubEnv('XENDIT_SECRET_KEY', 'test-key');
      
      const payment = createMockPayment();
      mockPrisma.paymentHistory.create.mockResolvedValue(payment);
      
      mockFetch.mockResolvedValue({
        ok: false,
        text: () => Promise.resolve('API Error'),
      });

      // Act & Assert
      await expect(
        paymentService.createInvoice({
          userId: 'user-123',
          userEmail: 'test@example.com',
          tier: 'CREATOR',
        })
      ).rejects.toThrow('Failed to create invoice');
    });
  });

  // ============================================================================
  // handleWebhook
  // ============================================================================
  describe('handleWebhook', () => {
    it('should upgrade subscription on PAID status', async () => {
      // Arrange
      const payment = createMockPayment({ xenditInvoiceId: 'inv-123' });
      mockPrisma.paymentHistory.findFirst.mockResolvedValue(payment);
      mockPrisma.paymentHistory.update.mockResolvedValue({ ...payment, status: 'PAID' });
      mockPrisma.subscription.upsert.mockResolvedValue(createMockSubscription({ tier: 'CREATOR' }));

      // Act
      await paymentService.handleWebhook({
        id: 'inv-123',
        external_id: 'ext-123',
        status: 'PAID',
        payment_method: 'QRIS',
        paid_at: '2024-01-01T00:00:00Z',
      });

      // Assert
      expect(mockPrisma.paymentHistory.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'PAID' }),
        })
      );
      expect(mockPrisma.subscription.upsert).toHaveBeenCalled();
    });

    it('should update status on EXPIRED', async () => {
      // Arrange
      const payment = createMockPayment();
      mockPrisma.paymentHistory.findFirst.mockResolvedValue(payment);
      mockPrisma.paymentHistory.update.mockResolvedValue({ ...payment, status: 'EXPIRED' });

      // Act
      await paymentService.handleWebhook({
        id: 'inv-123',
        external_id: 'ext-123',
        status: 'EXPIRED',
      });

      // Assert
      expect(mockPrisma.paymentHistory.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'EXPIRED' }),
        })
      );
    });

    it('should log warning when payment not found', async () => {
      // Arrange
      mockPrisma.paymentHistory.findFirst.mockResolvedValue(null);

      // Act
      await paymentService.handleWebhook({
        id: 'nonexistent',
        external_id: 'ext-123',
        status: 'PAID',
      });

      // Assert
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({ invoiceId: 'nonexistent' }),
        'Payment not found for webhook'
      );
    });
  });

  // ============================================================================
  // getSubscription
  // ============================================================================
  describe('getSubscription', () => {
    it('should return existing subscription', async () => {
      // Arrange
      const sub = createMockSubscription({ tier: 'CREATOR', exportsLimit: 50 });
      mockPrisma.subscription.findUnique.mockResolvedValue(sub);

      // Act
      const result = await paymentService.getSubscription('user-123');

      // Assert
      expect(result.tier).toBe('CREATOR');
      expect(result.price).toBe(99000);
    });

    it('should create FREE subscription when not exists', async () => {
      // Arrange
      mockPrisma.subscription.findUnique.mockResolvedValue(null);
      const newSub = createMockSubscription();
      mockPrisma.subscription.create.mockResolvedValue(newSub);

      // Act
      const result = await paymentService.getSubscription('new-user');

      // Assert
      expect(mockPrisma.subscription.create).toHaveBeenCalled();
      expect(result.tier).toBe('FREE');
    });

    it('should downgrade expired subscription to FREE', async () => {
      // Arrange
      const expiredSub = createMockSubscription({
        tier: 'CREATOR',
        validUntil: new Date('2020-01-01'), // Past date
      });
      mockPrisma.subscription.findUnique.mockResolvedValue(expiredSub);
      mockPrisma.subscription.update.mockResolvedValue({
        ...expiredSub,
        tier: 'FREE',
        status: 'EXPIRED',
      });

      // Act
      const result = await paymentService.getSubscription('user-123');

      // Assert
      expect(result.tier).toBe('FREE');
      expect(result.status).toBe('EXPIRED');
    });
  });

  // ============================================================================
  // useExport
  // ============================================================================
  describe('useExport', () => {
    it('should allow export and decrement remaining', async () => {
      // Arrange
      const sub = createMockSubscription({ exportsUsed: 2, exportsLimit: 5 });
      mockPrisma.subscription.findUnique.mockResolvedValue(sub);
      mockPrisma.subscription.update.mockResolvedValue({ ...sub, exportsUsed: 3 });

      // Act
      const result = await paymentService.useExport('user-123');

      // Assert
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(2);
    });

    it('should deny export when limit reached', async () => {
      // Arrange
      const sub = createMockSubscription({ exportsUsed: 5, exportsLimit: 5 });
      mockPrisma.subscription.findUnique.mockResolvedValue(sub);

      // Act
      const result = await paymentService.useExport('user-123');

      // Assert
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should always allow for unlimited (PRO) tier', async () => {
      // Arrange
      const proSub = createMockSubscription({ tier: 'PRO', exportsLimit: 999999 });
      mockPrisma.subscription.findUnique.mockResolvedValue(proSub);

      // Act
      const result = await paymentService.useExport('user-123');

      // Assert
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(-1);
    });
  });

  // ============================================================================
  // confirmMockPayment
  // ============================================================================
  describe('confirmMockPayment', () => {
    it('should confirm mock payment and upgrade subscription', async () => {
      // Arrange
      const payment = createMockPayment();
      mockPrisma.paymentHistory.findUnique.mockResolvedValue(payment);
      mockPrisma.paymentHistory.update.mockResolvedValue({ ...payment, status: 'PAID' });
      mockPrisma.subscription.upsert.mockResolvedValue(createMockSubscription({ tier: 'CREATOR' }));

      // Act
      await paymentService.confirmMockPayment('pay-123');

      // Assert
      expect(mockPrisma.paymentHistory.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'PAID', paymentMethod: 'MOCK' }),
        })
      );
    });

    it('should throw when payment not found', async () => {
      // Arrange
      mockPrisma.paymentHistory.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(paymentService.confirmMockPayment('nonexistent')).rejects.toThrow('Payment not found');
    });
  });
});
