/**
 * @module __tests__/security/input-validation
 * @description Security tests for input validation.
 *
 * Per Digitesia Testing Standard:
 * - Zod REQUIRED for all API input/output
 * - Implicit trust in client data FORBIDDEN
 * - Parameterized SQL REQUIRED
 */

import { describe, it, expect } from "vitest";
import { z } from "zod";

describe("Input Validation Security", () => {
  describe("Email Validation", () => {
    const emailSchema = z.email();

    it("should accept valid email", () => {
      expect(() => emailSchema.parse("user@example.com")).not.toThrow();
    });

    it("should reject email without @", () => {
      expect(() => emailSchema.parse("userexample.com")).toThrow();
    });

    it("should reject email without domain", () => {
      expect(() => emailSchema.parse("user@")).toThrow();
    });

    it("should reject email with spaces", () => {
      expect(() => emailSchema.parse("user @example.com")).toThrow();
    });

    it("should reject script injection in email", () => {
      expect(() =>
        emailSchema.parse("<script>alert(1)</script>@evil.com")
      ).toThrow();
    });
  });

  describe("URL Validation", () => {
    // Strict URL schema that only allows http/https
    const strictUrlSchema = z.url().refine((url) => /^https?:\/\//.test(url), {
      message: "URL must use http or https protocol",
    });

    it("should accept valid HTTPS URL", () => {
      expect(() => strictUrlSchema.parse("https://example.com")).not.toThrow();
    });

    it("should accept valid HTTP URL", () => {
      expect(() => strictUrlSchema.parse("http://example.com")).not.toThrow();
    });

    it("should reject javascript: protocol", () => {
      expect(() => strictUrlSchema.parse("javascript:alert(1)")).toThrow();
    });

    it("should reject data: protocol", () => {
      expect(() => strictUrlSchema.parse("data:text/html,<script>")).toThrow();
    });

    it("should reject file: protocol", () => {
      expect(() => strictUrlSchema.parse("file:///etc/passwd")).toThrow();
    });
  });

  describe("ID Validation", () => {
    const uuidSchema = z.uuid();

    it("should accept valid UUID", () => {
      expect(() =>
        uuidSchema.parse("123e4567-e89b-12d3-a456-426614174000")
      ).not.toThrow();
    });

    it("should reject sequential ID", () => {
      expect(() => uuidSchema.parse("1")).toThrow();
    });

    it("should reject SQL injection in ID", () => {
      expect(() => uuidSchema.parse("1; DROP TABLE users;")).toThrow();
    });

    it("should reject path traversal in ID", () => {
      expect(() => uuidSchema.parse("../../../etc/passwd")).toThrow();
    });
  });

  describe("String Length Limits", () => {
    const nameSchema = z.string().min(1).max(100);

    it("should reject empty string", () => {
      expect(() => nameSchema.parse("")).toThrow();
    });

    it("should reject string exceeding max length", () => {
      const longString = "a".repeat(101);
      expect(() => nameSchema.parse(longString)).toThrow();
    });

    it("should accept string within limits", () => {
      expect(() => nameSchema.parse("Valid Name")).not.toThrow();
    });
  });

  describe("Number Validation", () => {
    const positiveIntSchema = z.number().int().positive();
    const rangeSchema = z.number().min(0).max(100);

    it("should reject negative numbers", () => {
      expect(() => positiveIntSchema.parse(-1)).toThrow();
    });

    it("should reject NaN", () => {
      expect(() => positiveIntSchema.parse(NaN)).toThrow();
    });

    it("should reject Infinity", () => {
      expect(() => positiveIntSchema.parse(Infinity)).toThrow();
    });

    it("should reject numbers outside range", () => {
      expect(() => rangeSchema.parse(101)).toThrow();
    });
  });

  describe("Array Validation", () => {
    const arraySchema = z.array(z.string()).max(100);

    it("should reject array exceeding max length", () => {
      const largeArray = Array(101).fill("item");
      expect(() => arraySchema.parse(largeArray)).toThrow();
    });

    it("should accept array within limits", () => {
      const validArray = Array(50).fill("item");
      expect(() => arraySchema.parse(validArray)).not.toThrow();
    });
  });
});
