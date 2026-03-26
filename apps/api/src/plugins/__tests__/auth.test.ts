/**
 * @module plugins/__tests__/auth
 * @description Unit tests for auth plugin middleware.
 *
 * Tests:
 * - requireAuth middleware blocks unauthenticated
 * - requireAdmin middleware blocks non-admin
 * - Authorization policies enforced
 */

import type { FastifyReply, FastifyRequest } from 'fastify';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
  prisma: { userSession: { findUnique: vi.fn() } },
}));

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('@/utils/response', () => ({
  sendError: vi.fn(),
}));

vi.mock('@/lib/audit', () => ({
  audit: vi.fn(),
  AuditAction: {
    ACCESS_DENIED: 'ACCESS_DENIED',
  },
}));

import { requireAdmin, requireAuth } from '@/plugins/auth';
import { sendError } from '@/utils/response';

// Helper to create mock request/reply
function createMockContext(user: unknown = null) {
  const request = {
    user,
    session: user ? { token: 'test-token' } : null,
    headers: {},
    url: '/test',
  } as unknown as FastifyRequest;

  const reply = {
    status: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
  } as unknown as FastifyReply;

  return { request, reply };
}

describe('auth plugin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('requireAuth', () => {
    it('should call done() when user is authenticated', async () => {
      const { request, reply } = createMockContext({
        id: 'user-123',
        email: 'test@test.com',
        role: 'USER',
      });

      await requireAuth(request, reply);

      expect(sendError).not.toHaveBeenCalled();
    });

    it('should block unauthenticated requests', async () => {
      const { request, reply } = createMockContext(null);

      await requireAuth(request, reply);

      expect(sendError).toHaveBeenCalledWith(reply, expect.any(String), expect.any(String), 401);
    });

    it('should return 401 UNAUTHORIZED error code', async () => {
      const { request, reply } = createMockContext(null);

      await requireAuth(request, reply);

      expect(sendError).toHaveBeenCalledWith(
        reply,
        expect.stringContaining('UNAUTHORIZED'),
        expect.any(String),
        401,
      );
    });
  });

  describe('requireAdmin', () => {
    it('should call done() when user is admin', async () => {
      const { request, reply } = createMockContext({
        id: 'admin-123',
        email: 'admin@test.com',
        role: 'ADMIN',
      });

      await requireAdmin(request, reply);

      expect(sendError).not.toHaveBeenCalled();
    });

    it('should block non-admin users with 404', async () => {
      const { request, reply } = createMockContext({
        id: 'user-123',
        email: 'user@test.com',
        role: 'USER',
      });

      await requireAdmin(request, reply);

      expect(sendError).toHaveBeenCalledWith(
        reply,
        expect.stringContaining('NOT_FOUND'),
        expect.any(String),
        404,
      );
    });

    it('should block unauthenticated users with 401', async () => {
      const { request, reply } = createMockContext(null);

      await requireAdmin(request, reply);

      expect(sendError).toHaveBeenCalledWith(reply, expect.any(String), expect.any(String), 401);
    });

    it('should return NOT_FOUND for authenticated non-admin', async () => {
      const { request, reply } = createMockContext({
        id: 'user-123',
        email: 'user@test.com',
        role: 'USER',
      });

      await requireAdmin(request, reply);

      expect(sendError).toHaveBeenCalledWith(
        reply,
        expect.stringContaining('NOT_FOUND'),
        expect.any(String),
        404,
      );
    });
  });

  describe('Authorization edge cases', () => {
    it('should handle user with empty role', async () => {
      const { request, reply } = createMockContext({
        id: 'user-123',
        email: 'user@test.com',
        role: '',
      });

      await requireAdmin(request, reply);

      expect(sendError).toHaveBeenCalledWith(
        reply,
        expect.stringContaining('NOT_FOUND'),
        expect.any(String),
        404,
      );
    });

    it('should treat undefined role as non-admin', async () => {
      const { request, reply } = createMockContext({
        id: 'user-123',
        email: 'user@test.com',
      });

      await requireAdmin(request, reply);

      expect(sendError).toHaveBeenCalledWith(
        reply,
        expect.stringContaining('NOT_FOUND'),
        expect.any(String),
        404,
      );
    });
  });
});
