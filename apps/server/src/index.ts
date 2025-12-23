import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import cookie from '@fastify/cookie';

import { env } from '@/config/env';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';

import { errorHandlerPlugin } from '@/plugins/error-handler';

import { authRoutes } from '@/modules/auth/auth.routes';
import { promptRoutes } from '@/modules/prompt/prompt.routes';
import { exportRoutes } from '@/modules/export/export.routes';
import { uploadRoutes } from '@/modules/upload/upload.routes';
import { downloadRoutes } from '@/modules/download/download.routes';
import { loopRoutes } from '@/modules/loop/loop.routes';
import { reactionRoutes } from '@/modules/reaction/reaction.routes';
import { streamRoutes } from '@/modules/stream/stream.routes';
import { paymentRoutes } from '@/modules/payment/payment.routes';
import { adminRoutes } from '@/modules/admin/admin.routes';

async function main(): Promise<void> {
  const fastify = Fastify({
    logger: false, // We use pino directly
    requestIdHeader: 'x-request-id',
    genReqId: () => crypto.randomUUID(),
  });

  // Register plugins
  await fastify.register(helmet, {
    contentSecurityPolicy: false,
  });

  await fastify.register(cors, {
    origin: env.CORS_ORIGIN.split(','),
    credentials: true,
  });

  await fastify.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    redis,
  });

  await fastify.register(cookie);

  // Custom plugins (global scope)
  await fastify.register(errorHandlerPlugin);

  // Health check
  fastify.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // API routes
  await fastify.register(
    async (api) => {
      // Add auth hook directly in API context
      api.decorateRequest('user', null);
      api.decorateRequest('session', null);
      
      api.addHook('onRequest', async (request) => {
        const authHeader = request.headers.authorization;
        
        if (!authHeader?.startsWith('Bearer ')) {
          return;
        }

        const token = authHeader.slice(7);
        if (!token) return;

        const session = await prisma.userSession.findUnique({
          where: { token },
          include: { user: true },
        });

        if (!session) return;

        if (session.expiresAt < new Date()) {
          await prisma.userSession.delete({ where: { id: session.id } });
          return;
        }

        request.user = session.user;
        request.session = session;
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
    },
    { prefix: '/api/v1' }
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
    await fastify.listen({ port: env.PORT, host: '0.0.0.0' });
    logger.info(`🚀 Server running on http://localhost:${env.PORT}`);
    logger.info(`📚 API available at http://localhost:${env.PORT}/api/v1`);
  } catch (err) {
    logger.error(err, 'Failed to start server');
    process.exit(1);
  }
}

main();
