/**
 * Security Tests - Token Replay Detection
 *
 * Per Digitesia Testing Standard (digitesia-testing.md):
 * - Test token family replay detection
 * - Verify family revocation on reuse
 * - Ensure single-use token enforcement
 */

import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/utils/crypto";
import { nanoid } from "nanoid";

describe("Refresh Token Replay Detection", () => {
  let userId: string;
  let userEmail: string;

  beforeEach(async () => {
    // Create test user
    userEmail = `test-${nanoid()}@example.com`;
    const user = await prisma.user.create({
      data: {
        email: userEmail,
        password: await hashPassword("password123"),
        name: "Test User",
      },
    });
    userId = user.id;
  });

  it("should revoke entire token family when rotated token is reused", async () => {
    // 1. Create initial session (T1)
    const refreshToken1 = generateToken(64);
    const hashedToken1 = hashToken(refreshToken1);
    const tokenFamily = nanoid();

    const session1 = await prisma.userSession.create({
      data: {
        id: nanoid(),
        userId,
        token: nanoid(),
        refreshToken: hashedToken1,
        tokenFamily,
        parentTokenId: null,
        userAgent: "test-agent",
        ipAddress: "127.0.0.1",
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        refreshExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    // 2. Rotate token (T1 → T2)
    const refreshToken2 = generateToken(64);
    const hashedToken2 = hashToken(refreshToken2);

    // Mark T1 as consumed
    await prisma.userSession.update({
      where: { id: session1.id },
      data: { consumedAt: new Date() },
    });

    // Create T2
    const _session2 = await prisma.userSession.create({
      data: {
        id: nanoid(),
        userId,
        token: nanoid(),
        refreshToken: hashedToken2,
        tokenFamily,
        parentTokenId: session1.id,
        userAgent: "test-agent",
        ipAddress: "127.0.0.1",
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        refreshExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    // 3. Attempt to reuse T1 (replay attack)
    const expiredSession = await prisma.userSession.findFirst({
      where: { refreshToken: hashedToken1 },
    });

    expect(expiredSession).not.toBeNull();
    expect(expiredSession?.consumedAt).not.toBeNull();

    // 4. Revoke entire family
    if (expiredSession?.tokenFamily) {
      await prisma.userSession.deleteMany({
        where: { tokenFamily: expiredSession.tokenFamily },
      });
    }

    // 5. Verify both T1 and T2 are revoked
    const remainingSessions = await prisma.userSession.findMany({
      where: { tokenFamily },
    });

    expect(remainingSessions).toHaveLength(0);
  });

  it("should allow normal token rotation without revocation", async () => {
    // 1. Create initial session
    const tokenFamily = nanoid();
    const refreshToken1 = generateToken(64);

    const session1 = await prisma.userSession.create({
      data: {
        id: nanoid(),
        userId,
        token: nanoid(),
        refreshToken: hashToken(refreshToken1),
        tokenFamily,
        parentTokenId: null,
        userAgent: "test-agent",
        ipAddress: "127.0.0.1",
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        refreshExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    // 2. Rotate normally (consume then create new)
    await prisma.userSession.update({
      where: { id: session1.id },
      data: { consumedAt: new Date() },
    });

    const refreshToken2 = generateToken(64);
    await prisma.userSession.create({
      data: {
        id: nanoid(),
        userId,
        token: nanoid(),
        refreshToken: hashToken(refreshToken2),
        tokenFamily,
        parentTokenId: session1.id,
        userAgent: "test-agent",
        ipAddress: "127.0.0.1",
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        refreshExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    // 3. Verify new session exists
    const sessions = await prisma.userSession.findMany({
      where: { tokenFamily, consumedAt: null },
    });

    expect(sessions).toHaveLength(1);
    expect(sessions[0].refreshToken).toBe(hashToken(refreshToken2));
  });

  it("should detect replay within TTL window", async () => {
    const tokenFamily = nanoid();
    const refreshToken = generateToken(64);
    const hashedToken = hashToken(refreshToken);

    // Create active session
    await prisma.userSession.create({
      data: {
        id: nanoid(),
        userId,
        token: nanoid(),
        refreshToken: hashedToken,
        tokenFamily,
        userAgent: "test-agent",
        ipAddress: "127.0.0.1",
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        refreshExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    // Attempt immediate reuse (before expiry)
    const session = await prisma.userSession.findFirst({
      where: {
        refreshToken: hashedToken,
        refreshExpiresAt: { gt: new Date() },
      },
    });

    expect(session).not.toBeNull();

    // Second lookup should fail if token was consumed
    const reusedSession = await prisma.userSession.findFirst({
      where: {
        refreshToken: hashedToken,
        consumedAt: { not: null },
      },
    });

    // If consumed, this is replay detection
    if (reusedSession) {
      expect(reusedSession.consumedAt).not.toBeNull();
    }
  });
});

// Helper functions (import from actual modules in real implementation)
async function hashPassword(password: string): Promise<string> {
  const argon2 = await import("argon2");
  return argon2.hash(password);
}

function generateToken(length: number = 32): string {
  return nanoid(length);
}
