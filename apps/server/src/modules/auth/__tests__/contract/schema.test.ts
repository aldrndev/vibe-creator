/**
 * @module auth/__tests__/contract/schema
 * @description Contract tests for auth Zod schemas.
 *
 * Per Digitesia Testing Standard: Schema-first testing ensures
 * API contracts are validated and breaking changes are detected.
 */

import { describe, it, expect } from "vitest";
import { z } from "zod";

// Define auth schemas (mirroring auth.routes.ts)
const registerSchema = z.object({
  email: z.email("Email tidak valid"),
  password: z.string().min(8, "Password minimal 8 karakter"),
  name: z.string().min(2, "Nama minimal 2 karakter"),
  turnstileToken: z.string().min(1, "Captcha diperlukan"),
});

const loginSchema = z.object({
  email: z.email("Email tidak valid"),
  password: z.string().min(1, "Password diperlukan"),
  turnstileToken: z.string().min(1, "Captcha diperlukan"),
});

describe("auth.schema contracts", () => {
  describe("registerSchema", () => {
    const validPayload = {
      email: "test@example.com",
      password: "password123",
      name: "John Doe",
      turnstileToken: "token123",
    };

    it("should accept valid registration payload", () => {
      expect(() => registerSchema.parse(validPayload)).not.toThrow();
    });

    it("should reject invalid email", () => {
      expect(() =>
        registerSchema.parse({ ...validPayload, email: "invalid" })
      ).toThrow("Email tidak valid");
    });

    it("should reject short password", () => {
      expect(() =>
        registerSchema.parse({ ...validPayload, password: "short" })
      ).toThrow("Password minimal 8 karakter");
    });

    it("should reject short name", () => {
      expect(() =>
        registerSchema.parse({ ...validPayload, name: "J" })
      ).toThrow("Nama minimal 2 karakter");
    });

    it("should reject missing captcha", () => {
      expect(() =>
        registerSchema.parse({ ...validPayload, turnstileToken: "" })
      ).toThrow("Captcha diperlukan");
    });

    it("should reject missing required fields", () => {
      expect(() => registerSchema.parse({})).toThrow();
      expect(() =>
        registerSchema.parse({ email: "test@example.com" })
      ).toThrow();
    });
  });

  describe("loginSchema", () => {
    const validPayload = {
      email: "test@example.com",
      password: "any_password",
      turnstileToken: "token123",
    };

    it("should accept valid login payload", () => {
      expect(() => loginSchema.parse(validPayload)).not.toThrow();
    });

    it("should reject invalid email", () => {
      expect(() =>
        loginSchema.parse({ ...validPayload, email: "not-an-email" })
      ).toThrow("Email tidak valid");
    });

    it("should reject empty password", () => {
      expect(() =>
        loginSchema.parse({ ...validPayload, password: "" })
      ).toThrow("Password diperlukan");
    });

    it("should accept any password length for login", () => {
      // Login doesn't enforce min length like register
      expect(() =>
        loginSchema.parse({ ...validPayload, password: "x" })
      ).not.toThrow();
    });

    it("should reject missing captcha", () => {
      expect(() =>
        loginSchema.parse({ ...validPayload, turnstileToken: "" })
      ).toThrow("Captcha diperlukan");
    });
  });

  describe("API Response Shapes", () => {
    // Define expected response schemas
    const authSuccessResponseSchema = z.object({
      accessToken: z.string().min(1),
      expiresIn: z.number().positive(),
      user: z.object({
        id: z.string(),
        email: z.email(),
        name: z.string(),
        role: z.enum(["USER", "ADMIN"]),
      }),
    });

    const authErrorResponseSchema = z.object({
      success: z.literal(false),
      error: z.object({
        code: z.string(),
        message: z.string(),
      }),
    });

    it("should define success response with access token", () => {
      const mockResponse = {
        accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        expiresIn: 900,
        user: {
          id: "user-123",
          email: "test@example.com",
          name: "John",
          role: "USER" as const,
        },
      };
      expect(() => authSuccessResponseSchema.parse(mockResponse)).not.toThrow();
    });

    it("should define error response shape", () => {
      const mockError = {
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Invalid credentials",
        },
      };
      expect(() => authErrorResponseSchema.parse(mockError)).not.toThrow();
    });
  });

  describe("Security Constraints", () => {
    it("password minimum length should be 8 characters", () => {
      const shortPasswords = ["", "1", "1234567"];
      for (const pwd of shortPasswords) {
        expect(() =>
          registerSchema.parse({
            email: "test@test.com",
            password: pwd,
            name: "Test",
            turnstileToken: "token",
          })
        ).toThrow();
      }
    });

    it("should allow password with exactly 8 characters", () => {
      expect(() =>
        registerSchema.parse({
          email: "test@test.com",
          password: "12345678",
          name: "Test",
          turnstileToken: "token",
        })
      ).not.toThrow();
    });

    it("email should require valid format", () => {
      const invalidEmails = [
        "test",
        "test@",
        "@test.com",
        "test@test",
        "test.com",
      ];
      for (const email of invalidEmails) {
        expect(() =>
          registerSchema.parse({
            email,
            password: "password123",
            name: "Test",
            turnstileToken: "token",
          })
        ).toThrow();
      }
    });
  });
});
