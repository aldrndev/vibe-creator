import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { directorService } from '../director.service';

export const publishRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get<{ Params: { id: string } }>(
    '/sessions/:id/publish-copy',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const user = request.user;
      if (!user) {
        return reply.status(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      try {
        const copy = await directorService.getPublishCopy(request.params.id, user.id);
        return reply.send({
          success: true,
          data: copy,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to generate publish copy';
        const status = message.includes('not found') ? 404 : 400;
        return reply.status(status).send({
          success: false,
          error: { code: status === 404 ? 'NOT_FOUND' : 'GENERATION_FAILED', message },
        });
      }
    },
  );
};
