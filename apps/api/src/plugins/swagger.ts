/**
 * OpenAPI Documentation Plugin for Fastify
 *
 * Per Digitesia Standard (H1 - API Documentation):
 * - Auto-generated from code/schemas (Zod)
 * - Single source of truth
 * - Disabled by default in production
 * - Admin auth + IP allowlist if enabled in production
 */

import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { ERROR_CODES } from '@vibe-creator/shared';
import type { FastifyInstance } from 'fastify';
import { jsonSchemaTransform } from 'fastify-type-provider-zod';
import { env } from '@/config/env';
import { AuditAction, audit } from '@/lib/audit';
import { verifyAccessToken } from '@/lib/jwt';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { sendError } from '@/utils/response';

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
  if (env.NODE_ENV === 'production' && !env.ENABLE_SWAGGER) {
    logger.info('OpenAPI documentation disabled in production');
    return;
  }

  const allowedIps = (env.SWAGGER_ALLOWED_IPS || '')
    .split(',')
    .map((ip) => ip.trim())
    .filter(Boolean);

  if (env.NODE_ENV === 'production') {
    fastify.addHook('onRequest', async (request, reply) => {
      const url = request.raw.url || '';
      if (!url.startsWith('/documentation') && !url.startsWith('/openapi.json')) {
        return;
      }

      if (allowedIps.length > 0 && !allowedIps.includes(request.ip)) {
        await audit({
          requestId: request.id,
          action: AuditAction.ACCESS_DENIED,
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'] ?? undefined,
          metadata: { route: url, reason: 'ip_not_allowed' },
        });
        return sendError(reply, ERROR_CODES.FORBIDDEN, 'Access denied', 403);
      }

      const authHeader = request.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        await audit({
          requestId: request.id,
          action: AuditAction.ACCESS_DENIED,
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'] ?? undefined,
          metadata: { route: url, reason: 'missing_auth' },
        });
        return sendError(reply, ERROR_CODES.UNAUTHORIZED, 'Authentication required', 401);
      }

      const token = authHeader.slice(7);
      try {
        const payload = await verifyAccessToken(token);
        const user = await prisma.user.findUnique({
          where: { id: payload.sub },
        });

        if (!user || user.role !== 'ADMIN') {
          await audit({
            requestId: request.id,
            userId: payload.sub,
            tenantId: payload.tid,
            action: AuditAction.ACCESS_DENIED,
            ipAddress: request.ip,
            userAgent: request.headers['user-agent'] ?? undefined,
            metadata: { route: url, reason: 'not_admin' },
          });
          return sendError(reply, ERROR_CODES.FORBIDDEN, 'Access denied', 403);
        }

        await audit({
          requestId: request.id,
          userId: user.id,
          tenantId: payload.tid,
          action: AuditAction.ADMIN_ACTION,
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'] ?? undefined,
          metadata: { route: url, action: 'swagger_access' },
        });
      } catch {
        return sendError(reply, ERROR_CODES.UNAUTHORIZED, 'Authentication required', 401);
      }
    });
  }

  // Register OpenAPI spec generator
  await fastify.register(swagger, {
    transform: jsonSchemaTransform,
    openapi: {
      info: {
        title: 'Vibe Creator API',
        description: 'Content creation and video editing API',
        version: '1.0.0',
      },
      servers: [
        {
          url: `http://localhost:${env.PORT}`,
          description: 'Development server',
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'JWT access token (15-minute lifetime)',
          },
          cookieAuth: {
            type: 'apiKey',
            in: 'cookie',
            name: 'refreshToken',
            description: 'Refresh token for obtaining new access tokens',
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
          name: 'Authentication',
          description: 'User authentication and session management',
        },
        { name: 'Projects', description: 'Project management' },
        { name: 'Prompts', description: 'AI prompt generation' },
        { name: 'Media', description: 'File upload and download' },
        { name: 'Exports', description: 'Video export operations' },
        { name: 'Billing', description: 'Subscription and payments' },
        { name: 'Admin', description: 'Administrative operations' },
      ],
    },
  });

  // Register Swagger UI
  await fastify.register(swaggerUi, {
    routePrefix: '/documentation',
    uiConfig: {
      docExpansion: 'list', // Show operations collapsed
      deepLinking: true, // Enable deep linking to operations
      filter: true, // Enable filtering by tags/operations
      tryItOutEnabled: true, // Enable "Try it out" by default
    },
    staticCSP: true,
    transformStaticCSP: (header) => header,
  });

  fastify.get('/openapi.json', async (_request, reply) => {
    return reply.send(fastify.swagger());
  });

  logger.info({ route: '/documentation' }, 'OpenAPI documentation enabled');
}
