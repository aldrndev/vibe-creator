/**
 * @module auth/__tests__/unit/crypto
 * @description Unit tests for crypto utilities.
 *
 * Coverage:
 * - Password hashing with argon2
 * - Password verification
 * - Token generation (deterministic length)
 * - Token hashing with SHA-256
 */

import { describe, it, expect } from "vitest";
import {
  hashPassword,
  verifyPassword,
  generateToken,
  hashToken,
} from "@/utils/crypto";

describe("crypto utilities", () => {
  describe("hashPassword", () => {
    it("should hash password to different value than input", async () => {
      const password = "securePassword123!";
      const hashed = await hashPassword(password);

      expect(hashed).not.toBe(password);
      expect(hashed.length).toBeGreaterThan(0);
    });

    it("should produce different hashes for same password (salted)", async () => {
      const password = "securePassword123!";
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2);
    });

    it("should produce different hashes for different passwords", async () => {
      const hash1 = await hashPassword("password1");
      const hash2 = await hashPassword("password2");

      expect(hash1).not.toBe(hash2);
    });
  });

  describe("verifyPassword", () => {
    it("should return true for correct password", async () => {
      const password = "correctPassword123!";
      const hashed = await hashPassword(password);

      const isValid = await verifyPassword(password, hashed);

      expect(isValid).toBe(true);
    });

    it("should return false for incorrect password", async () => {
      const hashed = await hashPassword("correctPassword123!");

      const isValid = await verifyPassword("wrongPassword", hashed);

      expect(isValid).toBe(false);
    });

    it("should return false for empty password", async () => {
      const hashed = await hashPassword("correctPassword123!");

      const isValid = await verifyPassword("", hashed);

      expect(isValid).toBe(false);
    });
  });

  describe("generateToken", () => {
    it("should generate token with default length of 64", () => {
      const token = generateToken();

      expect(token.length).toBe(64);
    });

    it("should generate token with specified length", () => {
      const token = generateToken(32);

      expect(token.length).toBe(32);
    });

    it("should generate unique tokens on each call", () => {
      const token1 = generateToken();
      const token2 = generateToken();

      expect(token1).not.toBe(token2);
    });

    it("should generate URL-safe tokens", () => {
      const token = generateToken();
      // nanoid uses URL-safe alphabet
      const urlSafeRegex = /^[A-Za-z0-9_-]+$/;

      expect(urlSafeRegex.test(token)).toBe(true);
    });
  });

  describe("hashToken", () => {
    it("should produce consistent hash for same token", () => {
      const token = "test-refresh-token-12345";
      const hash1 = hashToken(token);
      const hash2 = hashToken(token);

      expect(hash1).toBe(hash2);
    });

    it("should produce different hashes for different tokens", () => {
      const hash1 = hashToken("token-1");
      const hash2 = hashToken("token-2");

      expect(hash1).not.toBe(hash2);
    });

    it("should produce hex-encoded SHA-256 hash (64 chars)", () => {
      const token = "any-token-value";
      const hashed = hashToken(token);

      expect(hashed.length).toBe(64);
      expect(/^[a-f0-9]+$/.test(hashed)).toBe(true);
    });

    it("should not be reversible to original token", () => {
      const token = "secret-token";
      const hashed = hashToken(token);

      expect(hashed).not.toContain(token);
    });
  });
});
