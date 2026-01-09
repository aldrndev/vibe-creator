/**
 * Audit Logging for Security Events
 *
 * Per Digitesia Standard (M5 - Audit Logging):
 * - Immutable append-only sink
 * - Correlation via requestId/jobId
 * - Tamper detection via hash chaining
 * - Required events: auth, admin, payments, exports, deletes
 */

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import crypto from "crypto";

export enum AuditAction {
  // Authentication
  LOGIN = "LOGIN",
  LOGOUT = "LOGOUT",
  REFRESH = "REFRESH",

  // Admin actions
  ADMIN_ACTION = "ADMIN_ACTION",
  ROLE_CHANGE = "ROLE_CHANGE",

  // Payments
  PAYMENT_CREATED = "PAYMENT_CREATED",
  PAYMENT_UPDATED = "PAYMENT_UPDATED",
  SUBSCRIPTION_CHANGED = "SUBSCRIPTION_CHANGED",

  // Resource operations
  EXPORT_CREATED = "EXPORT_CREATED",
  EXPORT_DELETED = "EXPORT_DELETED",
  PROJECT_DELETED = "PROJECT_DELETED",

  // Security
  ACCESS_DENIED = "ACCESS_DENIED",
  TOKEN_REPLAY_DETECTED = "TOKEN_REPLAY_DETECTED",
}

export interface AuditParams {
  requestId: string;
  jobId?: string;
  userId?: string;
  tenantId?: string;
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
      orderBy: { createdAt: "desc" },
      select: { id: true, createdAt: true, action: true },
    });

    // Calculate hash of previous entry
    let prevHash: string | null = null;
    if (prevEntry) {
      const prevData = JSON.stringify(prevEntry);
      prevHash = crypto.createHash("sha256").update(prevData).digest("hex");
    }

    // Create audit log entry
    await prisma.auditLog.create({
      data: {
        requestId: params.requestId,
        jobId: params.jobId,
        userId: params.userId,
        tenantId: params.tenantId || params.userId, // Fallback for user-scoped app
        action: params.action,
        resourceType: params.resourceType,
        resourceId: params.resourceId,
        metadata: (params.metadata as any) || {},
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        prevHash,
      },
    });

    logger.info(
      {
        requestId: params.requestId,
        userId: params.userId,
        action: params.action,
      },
      "Audit log created"
    );
  } catch (error) {
    // CRITICAL: Audit logging failures should not break the application
    // Log the error but continue
    logger.error(
      {
        err: error instanceof Error ? error.message : "Unknown error",
        params,
      },
      "Failed to create audit log"
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
      orderBy: { createdAt: "asc" },
      select: { id: true, createdAt: true, action: true, prevHash: true },
    });

    if (entries.length === 0) return true;

    // First entry should have no previous hash
    if (entries[0]?.prevHash !== null) {
      logger.warn("First audit log entry has prevHash - chain compromised");
      return false;
    }

    // Verify each subsequent entry
    for (let i = 1; i < entries.length; i++) {
      const prev = entries[i - 1];
      const current = entries[i];

      // Safety checks
      if (!prev || !current) {
        logger.warn({ index: i }, "Missing entry in audit chain");
        return false;
      }

      const expectedHash = crypto
        .createHash("sha256")
        .update(
          JSON.stringify({
            id: prev.id,
            createdAt: prev.createdAt,
            action: prev.action,
          })
        )
        .digest("hex");

      if (current.prevHash !== expectedHash) {
        logger.error(
          {
            index: i,
            expected: expectedHash,
            actual: current.prevHash,
          },
          "Audit log chain broken - tampering detected"
        );
        return false;
      }
    }

    return true;
  } catch (error) {
    logger.error(
      { err: error instanceof Error ? error.message : "Unknown error" },
      "Failed to verify audit chain"
    );
    return false;
  }
}
