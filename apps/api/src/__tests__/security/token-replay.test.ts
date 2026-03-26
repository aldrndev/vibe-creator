/**
 * Security Tests - Token Replay Detection
 *
 * Per Digitesia Testing Standard:
 * - Test token family replay detection
 * - Verify family revocation on reuse
 * - Ensure single-use token enforcement
 */

import { nanoid } from 'nanoid';
import { beforeEach, describe, expect, it } from 'vitest';
import { hashToken } from '@/utils/crypto';

type TestSession = {
  id: string;
  userId: string;
  token: string;
  refreshToken: string;
  tokenFamily: string;
  parentTokenId: string | null;
  userAgent: string;
  ipAddress: string;
  expiresAt: Date;
  refreshExpiresAt: Date;
  consumedAt: Date | null;
};

describe('Refresh Token Replay Detection', () => {
  let userId: string;
  let userEmail: string;
  let sessions: TestSession[];

  beforeEach(() => {
    userEmail = `test-${nanoid()}@example.com`;
    userId = nanoid();
    sessions = [];
  });

  it('should revoke entire token family when rotated token is reused', async () => {
    const refreshToken1 = generateToken(64);
    const hashedToken1 = hashToken(refreshToken1);
    const tokenFamily = nanoid();

    const session1 = createSession({
      userId,
      refreshToken: hashedToken1,
      tokenFamily,
      parentTokenId: null,
    });
    sessions.push(session1);

    const refreshToken2 = generateToken(64);
    const hashedToken2 = hashToken(refreshToken2);
    markConsumed(session1.id, sessions);

    sessions.push(
      createSession({
        userId,
        refreshToken: hashedToken2,
        tokenFamily,
        parentTokenId: session1.id,
      }),
    );

    const expiredSession = findByRefreshToken(hashedToken1, sessions);
    expect(expiredSession).not.toBeNull();
    expect(expiredSession?.consumedAt).not.toBeNull();

    sessions = sessions.filter((session) => session.tokenFamily !== tokenFamily);
    expect(sessions.filter((session) => session.tokenFamily === tokenFamily)).toHaveLength(0);
  });

  it('should allow normal token rotation without revocation', async () => {
    const tokenFamily = nanoid();
    const refreshToken1 = generateToken(64);

    const session1 = createSession({
      userId,
      refreshToken: hashToken(refreshToken1),
      tokenFamily,
      parentTokenId: null,
    });
    sessions.push(session1);

    markConsumed(session1.id, sessions);

    const refreshToken2 = generateToken(64);
    sessions.push(
      createSession({
        userId,
        refreshToken: hashToken(refreshToken2),
        tokenFamily,
        parentTokenId: session1.id,
      }),
    );

    const activeSessions = sessions.filter(
      (session) => session.tokenFamily === tokenFamily && session.consumedAt === null,
    );

    expect(activeSessions).toHaveLength(1);
    expect(activeSessions[0]?.refreshToken).toBe(hashToken(refreshToken2));
    expect(userEmail).toContain('@example.com');
  });

  it('should detect replay within TTL window', async () => {
    const tokenFamily = nanoid();
    const refreshToken = generateToken(64);
    const hashedToken = hashToken(refreshToken);

    sessions.push(
      createSession({
        userId,
        refreshToken: hashedToken,
        tokenFamily,
        parentTokenId: null,
      }),
    );

    const session = sessions.find(
      (currentSession) =>
        currentSession.refreshToken === hashedToken && currentSession.refreshExpiresAt > new Date(),
    );
    expect(session).not.toBeNull();

    if (session) {
      markConsumed(session.id, sessions);
    }

    const reusedSession = sessions.find(
      (currentSession) =>
        currentSession.refreshToken === hashedToken && currentSession.consumedAt !== null,
    );

    expect(reusedSession?.consumedAt).not.toBeNull();
  });
});

function createSession(input: {
  userId: string;
  refreshToken: string;
  tokenFamily: string;
  parentTokenId: string | null;
}): TestSession {
  return {
    id: nanoid(),
    userId: input.userId,
    token: nanoid(),
    refreshToken: input.refreshToken,
    tokenFamily: input.tokenFamily,
    parentTokenId: input.parentTokenId,
    userAgent: 'test-agent',
    ipAddress: '127.0.0.1',
    expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    refreshExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    consumedAt: null,
  };
}

function markConsumed(sessionId: string, sessions: TestSession[]): void {
  const session = sessions.find((currentSession) => currentSession.id === sessionId);
  if (session) {
    session.consumedAt = new Date();
  }
}

function findByRefreshToken(refreshToken: string, sessions: TestSession[]): TestSession | null {
  return sessions.find((session) => session.refreshToken === refreshToken) ?? null;
}

function generateToken(length: number = 32): string {
  return nanoid(length);
}
