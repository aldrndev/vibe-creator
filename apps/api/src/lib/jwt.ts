/**
 * JWT Implementation with jose
 *
 * Per Digitesia Standard (digitesia-standard-backend.md § Authentication):
 * - Cryptographic signature validation
 * - Mandatory claims: iss, aud, sub, tid, iat, exp, nbf
 * - kid (Key ID) for rotation support
 * - Access token lifetime ≤ 15 minutes MAX
 * - Algorithm allowlist (ES256/RS256)
 * - Clock skew tolerance (±60s)
 */

import { importJWK, type JWK, jwtVerify, SignJWT } from 'jose';
import { nanoid } from 'nanoid';
import { env } from '@/config/env';
import { logger } from '@/lib/logger';

// JWT Payload structure
export interface JWTPayload {
  iss: string; // Issuer: "vibe-creator-api"
  aud: string; // Audience: "vibe-creator-web"
  sub: string; // Subject: User ID
  tid: string; // Tenant ID (same as sub for user-scoped app)
  iat: number; // Issued at (Unix timestamp)
  exp: number; // Expires at (iat + 15 min MAX)
  nbf: number; // Not before (iat)
}

// Configuration
const ACCESS_TOKEN_TTL_MINUTES = 15; // MAX per standard
const CLOCK_SKEW_SECONDS = 60;

// Key ring for rotation support
interface KeyRingEntry {
  kid: string;
  key: JWK;
}

let signingKey: KeyRingEntry | null = null;
let verifyKeys: Map<string, JWK> = new Map();

/**
 * Initialize key ring from environment
 * Must be called at application startup
 */
export async function initializeKeyRing(): Promise<void> {
  try {
    // Active signing key
    const signingKeyId = env.JWT_SIGNING_KEY_ID || nanoid();
    const signingKeyJWK: JWK =
      typeof env.JWT_SIGNING_KEY === 'string'
        ? JSON.parse(env.JWT_SIGNING_KEY)
        : env.JWT_SIGNING_KEY;

    signingKey = {
      kid: signingKeyId,
      key: signingKeyJWK,
    };

    // Verify keys (includes active + previous for rotation overlap)
    const verifyKeysArray: JWK[] =
      typeof env.JWT_VERIFY_KEYS === 'string'
        ? JSON.parse(env.JWT_VERIFY_KEYS)
        : Array.isArray(env.JWT_VERIFY_KEYS)
          ? env.JWT_VERIFY_KEYS
          : [signingKeyJWK];

    verifyKeys = new Map();
    for (const jwk of verifyKeysArray) {
      const kid = jwk.kid || signingKeyId;
      verifyKeys.set(kid, jwk);
    }

    // Ensure signing key's PUBLIC key is in verify keys
    // For EC keys, we need to strip the 'd' (private) component for verification
    if (signingKey) {
      const publicKeyJWK = { ...signingKey.key };
      // Remove private key component 'd' to get public key only
      // ES256 verification requires public key, not private key
      if ('d' in publicKeyJWK) {
        delete (publicKeyJWK as Record<string, unknown>).d;
      }
      verifyKeys.set(signingKey.kid, publicKeyJWK);
    }

    logger.info(
      {
        signingKeyId: signingKey.kid,
        verifyKeyCount: verifyKeys.size,
      },
      'JWT key ring initialized',
    );
  } catch (error) {
    logger.error({ err: error }, 'Failed to initialize JWT key ring');
    throw new Error('JWT key ring initialization failed - check env vars');
  }
}

/**
 * Sign an access token (JWT)
 *
 * @param userId - User ID (becomes 'sub' claim)
 * @param tenantId - Tenant ID (becomes 'tid' claim, same as userId for user-scoped app)
 * @returns Signed JWT string
 */
export async function signAccessToken(userId: string, tenantId?: string): Promise<string> {
  if (!signingKey) {
    throw new Error('JWT key ring not initialized');
  }

  const now = Math.floor(Date.now() / 1000);
  const exp = now + ACCESS_TOKEN_TTL_MINUTES * 60;

  const payload: JWTPayload = {
    iss: env.JWT_ISSUER,
    aud: env.JWT_AUDIENCE,
    sub: userId,
    tid: tenantId || userId, // For user-scoped app, tid = sub
    iat: now,
    exp,
    nbf: now,
  };

  const key = await importJWK(signingKey.key, 'ES256');

  const jwt = await new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({
      alg: 'ES256',
      kid: signingKey.kid, // REQUIRED for rotation
    })
    .setIssuedAt(now)
    .setExpirationTime(exp)
    .setNotBefore(now)
    .sign(key);

  return jwt;
}

/**
 * Verify and decode an access token
 *
 * @param token - JWT string
 * @returns Decoded payload
 * @throws Error if token invalid, expired, or signature mismatch
 */
export async function verifyAccessToken(token: string): Promise<JWTPayload> {
  if (verifyKeys.size === 0) {
    throw new Error('JWT key ring not initialized');
  }

  try {
    // Extract kid from header with validation
    const parts = token.split('.');
    const headerB64 = parts[0];

    if (!headerB64) {
      throw new Error('Invalid JWT format - missing header');
    }

    const header = JSON.parse(Buffer.from(headerB64, 'base64').toString()) as {
      kid?: string;
    };
    const kid = header.kid;

    if (!kid) {
      throw new Error('JWT missing kid in header');
    }

    const jwk = verifyKeys.get(kid);
    if (!jwk) {
      throw new Error(`Unknown kid: ${kid}`);
    }

    const key = await importJWK(jwk, 'ES256');

    const { payload } = await jwtVerify(token, key, {
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE,
      clockTolerance: CLOCK_SKEW_SECONDS,
    });

    // Validate required claims
    if (!payload.sub || !payload.tid) {
      throw new Error('JWT missing required claims (sub, tid)');
    }

    return payload as unknown as JWTPayload;
  } catch (error) {
    if (error instanceof Error) {
      logger.warn({ err: error, message: error.message }, 'JWT verification failed');
    }
    throw error;
  }
}

/**
 * Get active signing key ID (for monitoring/rotation)
 */
export function getActiveKeyId(): string | null {
  return signingKey?.kid || null;
}

/**
 * Get verify key IDs (for monitoring)
 */
export function getVerifyKeyIds(): string[] {
  return Array.from(verifyKeys.keys());
}
