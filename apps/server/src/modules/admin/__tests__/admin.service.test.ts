/**
 * Admin Service Unit Tests
 * 
 * ✅ Happy path
 * ❌ Negative/error cases
 * 🔄 Edge cases
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Use vi.hoisted to create mocks that can be used in vi.mock factory
const { mockPrisma, mockLogger } = vi.hoisted(() => ({
  mockPrisma: {
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      delete: vi.fn(),
    },
    subscription: {
      count: vi.fn(),
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

// Import service AFTER mocks
import { adminService } from '../admin.service';

// Test data factories
function createMockUser(overrides = {}) {
  return {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    role: 'USER',
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

describe('adminService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // getStats
  // ============================================================================
  describe('getStats', () => {
    it('should return dashboard statistics', async () => {
      // Arrange
      mockPrisma.user.count.mockResolvedValue(100);
      mockPrisma.project.count.mockResolvedValue(50);
      mockPrisma.exportHistory.count.mockResolvedValue(200);
      mockPrisma.paymentHistory.count.mockResolvedValue(30);
      mockPrisma.subscription.count
        .mockResolvedValueOnce(70)  // FREE
        .mockResolvedValueOnce(20)  // CREATOR
        .mockResolvedValueOnce(10); // PRO
      mockPrisma.paymentHistory.findMany.mockResolvedValue([
        { amount: 100000 },
        { amount: 200000 },
      ]);

      // Act
      const result = await adminService.getStats();

      // Assert
      expect(result.users.total).toBe(100);
      expect(result.projects).toBe(50);
      expect(result.exports.total).toBe(200);
      expect(result.revenue.total).toBe(300000);
      expect(result.revenue.payments).toBe(30);
      expect(result.users.byTier.free).toBe(70);
    });

    it('should return zero revenue when no payments', async () => {
      // Arrange
      mockPrisma.user.count.mockResolvedValue(0);
      mockPrisma.project.count.mockResolvedValue(0);
      mockPrisma.exportHistory.count.mockResolvedValue(0);
      mockPrisma.paymentHistory.count.mockResolvedValue(0);
      mockPrisma.subscription.count.mockResolvedValue(0);
      mockPrisma.paymentHistory.findMany.mockResolvedValue([]);

      // Act
      const result = await adminService.getStats();

      // Assert
      expect(result.revenue.total).toBe(0);
    });

    it('should handle database error gracefully', async () => {
      // Arrange
      mockPrisma.user.count.mockRejectedValue(new Error('DB connection failed'));

      // Act & Assert
      await expect(adminService.getStats()).rejects.toThrow('DB connection failed');
    });
  });

  // ============================================================================
  // getUsers
  // ============================================================================
  describe('getUsers', () => {
    it('should return paginated users list', async () => {
      // Arrange
      const mockUsers = [
        createMockUser({ id: '1', email: 'user1@test.com' }),
        createMockUser({ id: '2', email: 'user2@test.com' }),
      ];
      mockPrisma.user.findMany.mockResolvedValue(mockUsers);
      mockPrisma.user.count.mockResolvedValue(2);

      // Act
      const result = await adminService.getUsers(1, 20);

      // Assert
      expect(result.users).toHaveLength(2);
      expect(result.pagination.total).toBe(2);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(20);
    });

    it('should filter users by search query', async () => {
      // Arrange
      const searchUser = createMockUser({ email: 'searched@test.com' });
      mockPrisma.user.findMany.mockResolvedValue([searchUser]);
      mockPrisma.user.count.mockResolvedValue(1);

      // Act
      const result = await adminService.getUsers(1, 20, 'searched');

      // Assert
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.any(Array),
          }),
        })
      );
      expect(result.users).toHaveLength(1);
    });

    it('should return empty list when no users match', async () => {
      // Arrange
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);

      // Act
      const result = await adminService.getUsers(1, 20, 'nonexistent');

      // Assert
      expect(result.users).toHaveLength(0);
      expect(result.pagination.total).toBe(0);
    });

    it('should calculate correct pagination for large datasets', async () => {
      // Arrange
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(100);

      // Act
      const result = await adminService.getUsers(3, 20);

      // Assert
      expect(result.pagination.pages).toBe(5);
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 40,
          take: 20,
        })
      );
    });
  });

  // ============================================================================
  // getUserDetails
  // ============================================================================
  describe('getUserDetails', () => {
    it('should return user with related data', async () => {
      // Arrange
      const mockUser = {
        ...createMockUser(),
        subscription: createMockSubscription(),
        projects: [],
        exports: [],
        payments: [],
      };
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      // Act
      const result = await adminService.getUserDetails('user-123');

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe('user-123');
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-123' },
        })
      );
    });

    it('should throw error when user not found', async () => {
      // Arrange
      mockPrisma.user.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(adminService.getUserDetails('nonexistent')).rejects.toThrow('User not found');
    });
  });

  // ============================================================================
  // updateUserSubscription
  // ============================================================================
  describe('updateUserSubscription', () => {
    it('should update user subscription to CREATOR tier', async () => {
      // Arrange
      const updatedSub = createMockSubscription({ tier: 'CREATOR', exportsLimit: 50 });
      mockPrisma.subscription.upsert.mockResolvedValue(updatedSub);

      // Act
      const result = await adminService.updateUserSubscription('user-123', 'CREATOR');

      // Assert
      expect(result.tier).toBe('CREATOR');
      expect(mockPrisma.subscription.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-123' },
          create: expect.objectContaining({ tier: 'CREATOR' }),
          update: expect.objectContaining({ tier: 'CREATOR' }),
        })
      );
    });

    it('should set unlimited exports for PRO tier', async () => {
      // Arrange
      const proSub = createMockSubscription({ tier: 'PRO', exportsLimit: 999999 });
      mockPrisma.subscription.upsert.mockResolvedValue(proSub);

      // Act
      await adminService.updateUserSubscription('user-123', 'PRO');

      // Assert
      expect(mockPrisma.subscription.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ exportsLimit: 999999 }),
        })
      );
    });

    it('should set validUntil to null for FREE tier', async () => {
      // Arrange
      const freeSub = createMockSubscription({ tier: 'FREE', validUntil: null });
      mockPrisma.subscription.upsert.mockResolvedValue(freeSub);

      // Act
      await adminService.updateUserSubscription('user-123', 'FREE');

      // Assert
      expect(mockPrisma.subscription.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ validUntil: null }),
        })
      );
    });
  });

  // ============================================================================
  // deleteUser
  // ============================================================================
  describe('deleteUser', () => {
    it('should delete user by id', async () => {
      // Arrange
      mockPrisma.user.delete.mockResolvedValue(createMockUser());

      // Act
      await adminService.deleteUser('user-123');

      // Assert
      expect(mockPrisma.user.delete).toHaveBeenCalledWith({
        where: { id: 'user-123' },
      });
    });

    it('should throw when user does not exist', async () => {
      // Arrange
      mockPrisma.user.delete.mockRejectedValue(new Error('Record not found'));

      // Act & Assert
      await expect(adminService.deleteUser('nonexistent')).rejects.toThrow('Record not found');
    });
  });
});
