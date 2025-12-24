/**
 * Prisma Mock Factory
 * 
 * ✅ REQUIRED: Use this for all service tests
 * ❌ FORBIDDEN: Import real prisma client in tests
 * 
 * Usage:
 * ```ts
 * const mockPrisma = createMockPrisma();
 * mockPrisma.user.findUnique.mockResolvedValue({ id: '1', ... });
 * ```
 */

import { vi } from 'vitest';
import type { PrismaClient } from '@prisma/client';

type MockPrismaClient = {
  [K in keyof PrismaClient]: K extends `$${string}`
    ? PrismaClient[K]
    : {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        [M in keyof PrismaClient[K]]: ReturnType<typeof vi.fn>;
      };
};

/**
 * Create a fresh mock Prisma client
 * Each test should call this in beforeEach
 */
export function createMockPrisma(): MockPrismaClient {
  return {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
      upsert: vi.fn(),
    },
    subscription: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
      upsert: vi.fn(),
    },
    session: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn(),
    },
    project: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    exportHistory: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    paymentHistory: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    announcement: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    $transaction: vi.fn((callback) => callback(createMockPrisma())),
    $connect: vi.fn(),
    $disconnect: vi.fn(),
  } as unknown as MockPrismaClient;
}

/**
 * Mock user factory for tests
 */
export function createMockUser(overrides = {}) {
  return {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    password: 'hashed-password',
    role: 'USER',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

/**
 * Mock subscription factory for tests
 */
export function createMockSubscription(overrides = {}) {
  return {
    id: 'sub-123',
    userId: 'user-123',
    tier: 'FREE',
    status: 'ACTIVE',
    exportsUsed: 0,
    exportsLimit: 5,
    validUntil: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}
