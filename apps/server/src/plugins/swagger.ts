/**
 * OpenAPI Documentation Plugin for Fastify
 *
 * Per Digitesia Standard (H1 - API Documentation):
 * - Auto-generated from code/schemas (Zod)
 * - Single source of truth
 * - Disabled by default in production
 * - Admin auth + IP allowlist if enabled in production
 */

import type { FastifyInstance } from "fastify";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { env } from "@/config/env";
import { logger } from "@/lib/logger";

/**
 * Register Swagger documentation plugin
 *
 * Behavior by environment:
 * - Development: Enabled at /documentation
 * - Staging: Enabled at /documentation
 * - Production: Disabled by default (Exception Protocol required)
 */
export async function registerSwagger(fastify: FastifyInstance): Promise<void> {
  // Production protection (Digitesia Standard H1)
  if (env.NODE_ENV === "production") {
    logger.info("OpenAPI documentation disabled in production");
    return;

    // Exception Protocol required for production access:
    // - Admin authentication REQUIRED
    // - IP allowlist REQUIRED
    // - Audit logging REQUIRED
  }

  // Register OpenAPI spec generator
  await fastify.register(swagger, {
    openapi: {
      info: {
        title: "Vibe Creator API",
        description: "Content creation and video editing API",
        version: "1.0.0",
      },
      servers: [
        {
          url: `http://localhost:${env.PORT}`,
          description: "Development server",
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
            description: "JWT access token (15-minute lifetime)",
          },
          cookieAuth: {
            type: "apiKey",
            in: "cookie",
            name: "refreshToken",
            description: "Refresh token for obtaining new access tokens",
          },
        },
      },
      security: [
        {
          bearerAuth: [],
        },
      ],
      tags: [
        {
          name: "Authentication",
          description: "User authentication and session management",
        },
        { name: "Projects", description: "Project management" },
        { name: "Prompts", description: "AI prompt generation" },
        { name: "Media", description: "File upload and download" },
        { name: "Exports", description: "Video export operations" },
        { name: "Billing", description: "Subscription and payments" },
        { name: "Admin", description: "Administrative operations" },
      ],
    },
  });

  // Register Swagger UI
  await fastify.register(swaggerUi, {
    routePrefix: "/documentation",
    uiConfig: {
      docExpansion: "list", // Show operations collapsed
      deepLinking: true, // Enable deep linking to operations
      filter: true, // Enable filtering by tags/operations
      tryItOutEnabled: true, // Enable "Try it out" by default
    },
    staticCSP: true,
    transformStaticCSP: (header) => header,
  });

  logger.info({ route: "/documentation" }, "OpenAPI documentation enabled");
}
