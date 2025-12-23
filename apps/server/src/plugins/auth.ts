import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '@/lib/prisma';
import { sendError } from '@/utils/response';
import { ERROR_CODES } from '@vibe-creator/shared';
import { logger } from '@/lib/logger';
import type { User, UserSession } from '@prisma/client';

declare module 'fastify' {
  interface FastifyRequest {
    user: User | null;
    session: UserSession | null;
  }
}

export async function authPlugin(fastify: FastifyInstance): Promise<void> {
  fastify.decorateRequest('user', null);
  fastify.decorateRequest('session', null);

  fastify.addHook('onRequest', async (request: FastifyRequest) => {
    const authHeader = request.headers.authorization;
    
    logger.info({ 
      url: request.url,
      hasAuth: !!authHeader,
      authStart: authHeader?.substring(0, 20),
    }, '[AUTH_PLUGIN] Request received');
    
    if (!authHeader?.startsWith('Bearer ')) {
      return;
    }

    const token = authHeader.slice(7);
    
    if (!token) {
      return;
    }

    const session = await prisma.userSession.findUnique({
      where: { token },
      include: { user: true },
    });

    logger.info({ sessionFound: !!session }, '[AUTH_PLUGIN] Session lookup');

    if (!session) {
      return;
    }

    if (session.expiresAt < new Date()) {
      logger.info('[AUTH_PLUGIN] Session expired');
      await prisma.userSession.delete({ where: { id: session.id } });
      return;
    }

    logger.info({ email: session.user.email }, '[AUTH_PLUGIN] User authenticated');
    request.user = session.user;
    request.session = session;
  });
}

export function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply,
  done: (err?: Error) => void
): void {
  if (!request.user) {
    sendError(reply, ERROR_CODES.UNAUTHORIZED, 'Autentikasi diperlukan', 401);
    return;
  }
  done();
}

export function requireAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
  done: (err?: Error) => void
): void {
  if (!request.user) {
    sendError(reply, ERROR_CODES.UNAUTHORIZED, 'Autentikasi diperlukan', 401);
    return;
  }
  if (request.user.role !== 'ADMIN') {
    sendError(reply, ERROR_CODES.FORBIDDEN, 'Akses admin diperlukan', 403);
    return;
  }
  done();
}
