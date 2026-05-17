import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import csrf from '@fastify/csrf-protection';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import Fastify from 'fastify';
import rawBody from 'fastify-raw-body';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';

import { env } from '@/config/env';
// JWT key ring initialization (Digitesia Standard C1)
import { initializeKeyRing } from '@/lib/jwt';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { adminRoutes } from '@/modules/admin/admin.routes';
import { authRoutes } from '@/modules/auth/auth.routes';
import { billingRoutes } from '@/modules/billing/billing.routes';
import { cleanupCron } from '@/modules/cron/cleanup.cron';
import { directorRoutes } from '@/modules/director/director.routes';
import { downloadRoutes } from '@/modules/download/download.routes';
import { exportRoutes } from '@/modules/export/export.routes';
import { loopRoutes } from '@/modules/loop/loop.routes';
import { paymentRoutes } from '@/modules/payment/payment.routes';
import { projectRoutes } from '@/modules/project/project.routes';
import { promptRoutes } from '@/modules/prompt/prompt.routes';
import { reactionRoutes } from '@/modules/reaction/reaction.routes';
import { jobRoutes } from '@/modules/story/job.routes';
import { streamRoutes } from '@/modules/stream/stream.routes';
import { trendingRoutes } from '@/modules/trending/trending.routes';
import { uploadRoutes } from '@/modules/upload/upload.routes';
import { videoStudioRoutes } from '@/modules/video-studio/video-studio.routes';
import { workspaceRoutes } from '@/modules/workspace/workspace.routes';
import { authPlugin } from '@/plugins/auth';
import { errorHandlerPlugin } from '@/plugins/error-handler';
import { registerSwagger } from '@/plugins/swagger';

import { startWorkers } from './workers';

// Handle BigInt serialization for Prisma
// @ts-expect-error BigInt does not have toJSON method by default
BigInt.prototype.toJSON = function () {
  return this.toString();
};

// Cache TTL for public announcements (seconds).
const ANNOUNCEMENTS_CACHE_TTL_SECONDS = 60;

async function main(): Promise<void> {
  const fastify = Fastify({
    logger: false, // We use pino directly
    requestIdHeader: 'x-request-id',
    genReqId: () => crypto.randomUUID(),
  });

  fastify.setValidatorCompiler(validatorCompiler);
  fastify.setSerializerCompiler(serializerCompiler);

  // Register plugins
  await fastify.register(rawBody, {
    field: 'rawBody',
    global: false,
    encoding: 'utf8',
    runFirst: true,
  });

  // Security headers (Digitesia Standard - § Security Hardening)
  await fastify.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        frameAncestors: ["'none'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
      },
    },
  });

  await fastify.register(cors, {
    origin: env.CORS_ORIGIN.split(','),
    methods: ['GET', 'HEAD', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  await fastify.register(cookie, {
    secret: env.JWT_SECRET,
  });

  // CSRF protection for cookie-based endpoints (Digitesia Standard M3)
  await fastify.register(csrf, {
    cookieOpts: {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'strict',
    },
  });

  // Custom plugins (global scope)
  await fastify.register(errorHandlerPlugin);
  await registerSwagger(fastify);

  // Health check
  fastify.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // API routes
  await fastify.register(
    async (api) => {
      await authPlugin(api);

      // Skip rate limit plugin entirely in test mode to avoid Redis blocking
      if (!env.RATE_LIMIT_TEST_MODE) {
        await api.register(rateLimit, {
          max: 100,
          timeWindow: '15 minutes',
          redis,
          keyGenerator: (request) => {
            const routeKey = request.url.split('?')[0] || 'global';
            const tenantId = request.auth?.tenantId || request.user?.id;
            const userId = request.auth?.userId || request.user?.id;

            if (tenantId && userId) {
              return `global:${tenantId}:${userId}:${routeKey}`;
            }

            return `global:ip:${request.ip}:${routeKey}`;
          },
        });
      }

      // Public announcements endpoint (no auth required)
      api.get('/announcements', async (_request, reply) => {
        const cacheKey = 'announcements:active';
        if (redis.status === 'ready') {
          const cached = await redis.get(cacheKey);
          if (cached) {
            return reply.send({ success: true, data: JSON.parse(cached) });
          }
        }

        const announcements = await prisma.announcement.findMany({
          where: { isActive: true },
          orderBy: { createdAt: 'desc' },
          take: 10,
        });

        if (redis.status === 'ready') {
          await redis.set(
            cacheKey,
            JSON.stringify(announcements),
            'EX',
            ANNOUNCEMENTS_CACHE_TTL_SECONDS,
          );
        }

        return reply.send({ success: true, data: announcements });
      });

      await api.register(authRoutes, { prefix: '/auth' });
      await api.register(promptRoutes, { prefix: '/prompts' });
      await api.register(exportRoutes, { prefix: '/export' });
      await api.register(uploadRoutes, { prefix: '/upload' });
      await api.register(downloadRoutes, { prefix: '/download' });
      await api.register(loopRoutes, { prefix: '/loop' });
      await api.register(reactionRoutes, { prefix: '/reaction' });
      await api.register(streamRoutes, { prefix: '/stream' });
      await api.register(paymentRoutes, { prefix: '/payment' });
      await api.register(adminRoutes, { prefix: '/admin' });
      await api.register(projectRoutes, { prefix: '/projects' });
      await api.register(videoStudioRoutes, { prefix: '/video-studio' });
      await api.register(workspaceRoutes, { prefix: '/workspaces' });
      await api.register(billingRoutes, { prefix: '/billing' });
      await api.register(jobRoutes, { prefix: '/jobs' });
      await api.register(directorRoutes, { prefix: '/director' });
      await api.register(trendingRoutes, { prefix: '/trending' });
    },
    { prefix: '/api/v1' },
  );

  // Graceful shutdown
  const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];

  for (const signal of signals) {
    process.on(signal, async () => {
      logger.info(`Received ${signal}, shutting down gracefully...`);

      await fastify.close();
      await prisma.$disconnect();
      await redis.quit();

      logger.info('Server shut down successfully');
      process.exit(0);
    });
  }

  // Start server
  try {
    // Initialize JWT key ring (Digitesia Standard C1)
    logger.info('Initializing JWT key ring...');
    await initializeKeyRing();
    logger.info('JWT key ring initialized successfully');

    // Start background workers
    await startWorkers();

    // Start cleanup cron
    cleanupCron.start();

    await fastify.listen({ port: env.PORT, host: '0.0.0.0' });
    logger.info(`🚀 Server running on http://localhost:${env.PORT}`);
    logger.info(`📚 API available at http://localhost:${env.PORT}/api/v1`);
    logger.info(`🎬 Cobalt API: ${env.COBALT_API_URL || 'Not configured - using yt-dlp fallback'}`);
  } catch (err) {
    logger.error(err, 'Failed to start server');
    process.exit(1);
  }
}

main();
