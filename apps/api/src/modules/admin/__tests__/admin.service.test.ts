import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockPrisma, mockLogger } = vi.hoisted(() => ({
  mockPrisma: {
    $transaction: vi.fn(),
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
    },
    userSession: {
      deleteMany: vi.fn(),
    },
    subscription: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    project: {
      count: vi.fn(),
    },
    exportHistory: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    paymentHistory: {
      count: vi.fn(),
      aggregate: vi.fn(),
      findMany: vi.fn(),
    },
    announcement: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
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

import { AdminServiceError, adminService } from '../admin.service';

interface MockUser {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  createdAt: Date;
}

interface MockSubscription {
  id: string;
  userId: string;
  tier: string;
  status: string;
  exportsUsed: number;
  exportsLimit: number;
  validUntil: Date | null;
}

function createMockUser(overrides: Partial<MockUser> = {}): MockUser {
  return {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    role: 'USER',
    status: 'ACTIVE',
    createdAt: new Date('2024-01-01'),
    ...overrides,
  };
}

function createMockSubscription(overrides: Partial<MockSubscription> = {}): MockSubscription {
  return {
    id: 'sub-123',
    userId: 'user-123',
    tier: 'FREE',
    status: 'ACTIVE',
    exportsUsed: 7,
    exportsLimit: 5,
    validUntil: null,
    ...overrides,
  };
}

describe('adminService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.$transaction.mockImplementation(async (operations: Promise<unknown>[]) =>
      Promise.all(operations),
    );
  });

  describe('getStats', () => {
    it('counts active, suspended, deleted, and free users correctly', async () => {
      mockPrisma.user.count
        .mockResolvedValueOnce(100)
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(20)
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(8);
      mockPrisma.project.count.mockResolvedValue(50);
      mockPrisma.exportHistory.count.mockResolvedValueOnce(200).mockResolvedValueOnce(12);
      mockPrisma.paymentHistory.count.mockResolvedValue(30);
      mockPrisma.paymentHistory.aggregate.mockResolvedValue({ _sum: { amount: 300_000 } });

      const result = await adminService.getStats();

      expect(result.users.total).toBe(100);
      expect(result.users.byStatus).toEqual({ active: 100, suspended: 5, deleted: 2 });
      expect(result.users.byTier).toEqual({ free: 70, creator: 20, pro: 10 });
      expect(result.revenue.total).toBe(300_000);
      expect(mockPrisma.paymentHistory.aggregate).toHaveBeenCalledWith({
        where: { status: 'PAID' },
        _sum: { amount: true },
      });
    });

    it('returns zero revenue when aggregate sum is empty', async () => {
      mockPrisma.user.count.mockResolvedValue(0);
      mockPrisma.project.count.mockResolvedValue(0);
      mockPrisma.exportHistory.count.mockResolvedValue(0);
      mockPrisma.paymentHistory.count.mockResolvedValue(0);
      mockPrisma.paymentHistory.aggregate.mockResolvedValue({ _sum: { amount: null } });

      const result = await adminService.getStats();

      expect(result.revenue.total).toBe(0);
    });
  });

  describe('getUsers', () => {
    it('returns server-side pagination metadata', async () => {
      mockPrisma.user.findMany.mockResolvedValue([
        createMockUser({ id: '1' }),
        createMockUser({ id: '2' }),
      ]);
      mockPrisma.user.count.mockResolvedValue(42);

      const result = await adminService.getUsers({
        page: 3,
        limit: 20,
        search: undefined,
        status: 'ACTIVE',
        tier: 'ALL',
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });

      expect(result.pagination).toEqual({ page: 3, limit: 20, total: 42, pages: 3 });
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 40, take: 20 }),
      );
    });

    it('combines search and free-tier filters without leaking unrelated users', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);

      await adminService.getUsers({
        page: 1,
        limit: 20,
        search: 'creator',
        status: 'ACTIVE',
        tier: 'FREE',
        sortBy: 'name',
        sortOrder: 'asc',
      });

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'ACTIVE',
            AND: expect.arrayContaining([
              expect.objectContaining({ OR: expect.any(Array) }),
              expect.objectContaining({ OR: expect.any(Array) }),
            ]),
          }),
        }),
      );
    });
  });

  describe('getUserDetails', () => {
    it('returns user details with related data', async () => {
      const mockUser = {
        ...createMockUser(),
        subscription: createMockSubscription(),
        projects: [],
        exports: [],
        payments: [],
      };
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await adminService.getUserDetails('user-123');

      expect(result.id).toBe('user-123');
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'user-123' } }),
      );
    });

    it('throws a typed error when user is missing', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(adminService.getUserDetails('missing')).rejects.toBeInstanceOf(
        AdminServiceError,
      );
    });
  });

  describe('updateUserSubscription', () => {
    it('preserves export usage by default', async () => {
      const previous = createMockSubscription({ exportsUsed: 9 });
      const updated = createMockSubscription({
        tier: 'CREATOR',
        exportsUsed: 9,
        exportsLimit: 50,
      });
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-123' });
      mockPrisma.subscription.findUnique.mockResolvedValue(previous);
      mockPrisma.subscription.upsert.mockResolvedValue(updated);

      const result = await adminService.updateUserSubscription('user-123', {
        tier: 'CREATOR',
        validDays: 30,
        resetUsage: false,
      });

      expect(result.subscription.exportsUsed).toBe(9);
      expect(mockPrisma.subscription.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.not.objectContaining({ exportsUsed: 0 }),
        }),
      );
    });

    it('resets usage only when admin explicitly requests it', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-123' });
      mockPrisma.subscription.findUnique.mockResolvedValue(createMockSubscription());
      mockPrisma.subscription.upsert.mockResolvedValue(
        createMockSubscription({ tier: 'PRO', exportsUsed: 0, exportsLimit: 999_999 }),
      );

      await adminService.updateUserSubscription('user-123', {
        tier: 'PRO',
        validDays: 60,
        resetUsage: true,
      });

      expect(mockPrisma.subscription.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({ exportsUsed: 0, exportsLimit: 999_999 }),
        }),
      );
    });

    it('throws a typed error when the target user is missing', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        adminService.updateUserSubscription('missing', {
          tier: 'FREE',
          validDays: 30,
          resetUsage: false,
        }),
      ).rejects.toBeInstanceOf(AdminServiceError);
    });
  });

  describe('updateUserStatus', () => {
    it('rejects self suspend or delete', async () => {
      await expect(
        adminService.updateUserStatus('admin-1', 'admin-1', {
          status: 'SUSPENDED',
          reason: 'test',
        }),
      ).rejects.toMatchObject({ code: 'SELF_ACTION_FORBIDDEN' });
    });

    it('suspends a user and revokes sessions', async () => {
      const suspendedUser = createMockUser({ status: 'SUSPENDED' });
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-123' });
      mockPrisma.user.update.mockResolvedValue(suspendedUser);
      mockPrisma.userSession.deleteMany.mockResolvedValue({ count: 3 });

      const result = await adminService.updateUserStatus('admin-1', 'user-123', {
        status: 'SUSPENDED',
        reason: 'abuse',
      });

      expect(result.status).toBe('SUSPENDED');
      expect(mockPrisma.userSession.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
      });
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'SUSPENDED',
            suspensionReason: 'abuse',
            deletedAt: null,
          }),
        }),
      );
    });

    it('soft deletes without physically deleting user data', async () => {
      const deletedUser = createMockUser({ status: 'DELETED' });
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-123' });
      mockPrisma.user.update.mockResolvedValue(deletedUser);
      mockPrisma.userSession.deleteMany.mockResolvedValue({ count: 1 });

      const result = await adminService.softDeleteUser('admin-1', 'user-123');

      expect(result.status).toBe('DELETED');
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'DELETED',
            deletedAt: expect.any(Date),
          }),
        }),
      );
    });

    it('restores a user back to active and clears restriction fields', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-123' });
      mockPrisma.user.update.mockResolvedValue(createMockUser({ status: 'ACTIVE' }));
      mockPrisma.userSession.deleteMany.mockResolvedValue({ count: 0 });

      await adminService.updateUserStatus('admin-1', 'user-123', { status: 'ACTIVE' });

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'ACTIVE',
            deletedAt: null,
            suspendedAt: null,
            suspensionReason: null,
          }),
        }),
      );
    });
  });
});
