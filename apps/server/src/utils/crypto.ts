import { hash, verify } from 'argon2';
import { nanoid } from 'nanoid';

export async function hashPassword(password: string): Promise<string> {
  return hash(password);
}

export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return verify(hashedPassword, password);
}

export function generateToken(length: number = 64): string {
  return nanoid(length);
}

export function generateId(): string {
  return nanoid(21);
}
