/**
 * Audit Logging for Security Events
 *
 * Per Digitesia Standard (M5 - Audit Logging):
 * - Immutable append-only sink
 * - Correlation via requestId/jobId
 * - Tamper detection via hash chaining
 * - Required events: auth, admin, payments, exports, deletes
 */

import crypto from 'node:crypto';
// import { Prisma } from "@prisma/client";
import type { Prisma } from '@prisma/client';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';

export enum AuditAction {
  // Authentication
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  REFRESH = 'REFRESH',

  // Admin actions
  ADMIN_ACTION = 'ADMIN_ACTION',
  ROLE_CHANGE = 'ROLE_CHANGE',

  // Payments
  PAYMENT_CREATED = 'PAYMENT_CREATED',
  PAYMENT_UPDATED = 'PAYMENT_UPDATED',
  SUBSCRIPTION_CHANGED = 'SUBSCRIPTION_CHANGED',

  // Resource operations
  EXPORT_CREATED = 'EXPORT_CREATED',
  EXPORT_DELETED = 'EXPORT_DELETED',
  PROJECT_DELETED = 'PROJECT_DELETED',
  RESOURCE_DELETED = 'RESOURCE_DELETED',

  // Security
  ACCESS_DENIED = 'ACCESS_DENIED',
  TOKEN_REPLAY_DETECTED = 'TOKEN_REPLAY_DETECTED',
}

export interface AuditParams {
  requestId: string;
  jobId?: string;
  userId?: string;
  tenantId?: string;
  sessionId?: string;
  action: AuditAction;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Create immutable audit log entry
 *
 * Features:
 * - Hash chaining for tamper detection
 * - Never fails (catches and logs errors)
 * - Correlation with requestId/jobId
 *
 * @param params - Audit log parameters
 */
export async function audit(params: AuditParams): Promise<void> {
  try {
    // Get previous entry for hash chaining
    const prevEntry = await prisma.auditLog.findFirst({
      orderBy: { created_at: 'desc' },
      select: { id: true, created_at: true, action: true },
    });

    // Calculate hash of previous entry
    let prevHash: string | null = null;
    if (prevEntry) {
      const prevData = JSON.stringify(prevEntry);
      prevHash = crypto.createHash('sha256').update(prevData).digest('hex');
    }

    // Create audit log entry
    await prisma.auditLog.create({
      data: {
        request_id: params.requestId,
        job_id: params.jobId,
        user_id: params.userId,
        tenant_id: params.tenantId || params.userId, // Fallback for user-scoped app
        session_id: params.sessionId,
        action: params.action,
        resource_type: params.resourceType,
        resource_id: params.resourceId,
        metadata: (params.metadata || {}) as Prisma.InputJsonValue,
        ip_address: params.ipAddress,
        user_agent: params.userAgent,
        prev_hash: prevHash,
      },
    });

    logger.info(
      {
        requestId: params.requestId,
        userId: params.userId,
        action: params.action,
      },
      'Audit log created',
    );
  } catch (error) {
    // CRITICAL: Audit logging failures should not break the application
    // Log the error but continue
    logger.error(
      {
        err: error instanceof Error ? error.message : 'Unknown error',
        params,
      },
      'Failed to create audit log',
    );
  }
}

/**
 * Verify audit log integrity via hash chain
 *
 * @returns True if chain is valid, false if tampered
 */
export async function verifyAuditChain(): Promise<boolean> {
  try {
    const entries = await prisma.auditLog.findMany({
      orderBy: { created_at: 'asc' },
      select: { id: true, created_at: true, action: true, prev_hash: true },
    });

    if (entries.length === 0) return true;

    // First entry should have no previous hash
    if (entries[0]?.prev_hash !== null) {
      logger.warn('First audit log entry has prevHash - chain compromised');
      return false;
    }

    // Verify each subsequent entry
    for (let i = 1; i < entries.length; i++) {
      const prev = entries[i - 1];
      const current = entries[i];

      // Safety checks
      if (!prev || !current) {
        logger.warn({ index: i }, 'Missing entry in audit chain');
        return false;
      }

      const expectedHash = crypto
        .createHash('sha256')
        .update(
          JSON.stringify({
            id: prev.id,
            createdAt: prev.created_at,
            action: prev.action,
          }),
        )
        .digest('hex');

      if (current.prev_hash !== expectedHash) {
        logger.error(
          {
            index: i,
            expected: expectedHash,
            actual: current.prev_hash,
          },
          'Audit log chain broken - tampering detected',
        );
        return false;
      }
    }

    return true;
  } catch (error) {
    logger.error(
      { err: error instanceof Error ? error.message : 'Unknown error' },
      'Failed to verify audit chain',
    );
    return false;
  }
}
