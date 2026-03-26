import { createHash } from 'node:crypto';
import { hash, verify } from 'argon2';
import { nanoid } from 'nanoid';

export async function hashPassword(password: string): Promise<string> {
  return hash(password);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return verify(hashedPassword, password);
}

export function generateToken(length: number = 64): string {
  return nanoid(length);
}

export function generateId(): string {
  return nanoid(21);
}

/**
 * Hash a token using SHA-256 for storage
 * Used for refresh tokens - fast hash since tokens are high-entropy random strings
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
