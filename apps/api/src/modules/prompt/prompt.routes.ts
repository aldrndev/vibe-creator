import { performance } from 'node:perf_hooks';
import { DEFAULT_LIMIT, DEFAULT_PAGE, ERROR_CODES, MAX_LIMIT } from '@vibe-creator/shared';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { AuditAction, audit } from '@/lib/audit';
import { requireAuth } from '@/plugins/auth';
import { enforceQueryBudget } from '@/utils/query-budget';
import {
  sendCreated,
  sendError,
  sendNoContent,
  sendPaginated,
  sendSuccess,
} from '@/utils/response';
import { createPromptSchema, createVersionSchema, promptTypeSchema } from './prompt.schemas';
import { promptService } from './prompt.service';

const listQuerySchema = z.object({
  page: z.coerce.number().min(1).default(DEFAULT_PAGE),
  limit: z.coerce.number().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT),
  type: promptTypeSchema.optional(),
});

function getAuthenticatedUserId(request: {
  user: { id: string } | null;
  auth: { userId: string } | null;
}) {
  return request.user?.id ?? request.auth?.userId ?? null;
}

export async function promptRoutes(fastify: FastifyInstance): Promise<void> {
  // All routes require authentication
  fastify.addHook('preHandler', requireAuth);

  // List prompts
  fastify.get('/', async (request, reply) => {
    const userId = getAuthenticatedUserId(request);
    if (!userId) {
      return sendError(reply, ERROR_CODES.UNAUTHORIZED, 'Autentikasi diperlukan', 401);
    }
    const query = listQuerySchema.parse(request.query);

    const start = performance.now();
    const { data, total } = await promptService.listPrompts({
      userId,
      ...query,
    });
    const durationMs = performance.now() - start;

    if (enforceQueryBudget(reply, { durationMs, rows: data.length })) {
      return reply;
    }

    return sendPaginated(reply, data, total, query.page, query.limit);
  });

  // Get single prompt with all versions
  fastify.get('/:id', async (request, reply) => {
    const userId = getAuthenticatedUserId(request);
    if (!userId) {
      return sendError(reply, ERROR_CODES.UNAUTHORIZED, 'Autentikasi diperlukan', 401);
    }
    const { id } = request.params as { id: string };

    const prompt = await promptService.getPrompt(id, userId);

    if (!prompt) {
      return sendError(reply, ERROR_CODES.NOT_FOUND, 'Prompt tidak ditemukan', 404);
    }

    return sendSuccess(reply, prompt);
  });

  // Create new prompt
  fastify.post('/', async (request, reply) => {
    const userId = getAuthenticatedUserId(request);
    if (!userId) {
      return sendError(reply, ERROR_CODES.UNAUTHORIZED, 'Autentikasi diperlukan', 401);
    }
    const body = createPromptSchema.parse(request.body);

    const result = await promptService.createPrompt({
      userId,
      type: body.type,
      title: body.title,
      inputData: body.inputData,
    });

    return sendCreated(reply, result);
  });

  // Create new version of existing prompt
  fastify.post('/:id/versions', async (request, reply) => {
    const userId = getAuthenticatedUserId(request);
    if (!userId) {
      return sendError(reply, ERROR_CODES.UNAUTHORIZED, 'Autentikasi diperlukan', 401);
    }
    const { id } = request.params as { id: string };
    const body = createVersionSchema.parse(request.body);

    const result = await promptService.createVersion({
      userId,
      promptId: id,
      inputData: body.inputData,
      userNotes: body.userNotes,
    });

    if (!result) {
      return sendError(reply, ERROR_CODES.NOT_FOUND, 'Prompt tidak ditemukan', 404);
    }

    return sendCreated(reply, result);
  });

  // Get specific version
  fastify.get('/:id/versions/:version', async (request, reply) => {
    const userId = getAuthenticatedUserId(request);
    if (!userId) {
      return sendError(reply, ERROR_CODES.UNAUTHORIZED, 'Autentikasi diperlukan', 401);
    }
    const { id, version } = request.params as { id: string; version: string };

    const result = await promptService.getVersion(id, Number.parseInt(version, 10), userId);

    if (!result) {
      return sendError(reply, ERROR_CODES.NOT_FOUND, 'Versi atau Prompt tidak ditemukan', 404);
    }

    return sendSuccess(reply, result);
  });

  // Update prompt title
  fastify.patch('/:id', async (request, reply) => {
    const userId = getAuthenticatedUserId(request);
    if (!userId) {
      return sendError(reply, ERROR_CODES.UNAUTHORIZED, 'Autentikasi diperlukan', 401);
    }
    const { id } = request.params as { id: string };
    const body = z.object({ title: z.string().min(1).max(200) }).parse(request.body);

    const updated = await promptService.updatePrompt(id, userId, body.title);

    if (!updated) {
      return sendError(reply, ERROR_CODES.NOT_FOUND, 'Prompt tidak ditemukan', 404);
    }

    return sendSuccess(reply, updated);
  });

  // Delete prompt
  fastify.delete('/:id', async (request, reply) => {
    const userId = getAuthenticatedUserId(request);
    if (!userId) {
      return sendError(reply, ERROR_CODES.UNAUTHORIZED, 'Autentikasi diperlukan', 401);
    }
    const { id } = request.params as { id: string };

    const success = await promptService.deletePrompt(id, userId);

    if (!success) {
      return sendError(reply, ERROR_CODES.NOT_FOUND, 'Prompt tidak ditemukan', 404);
    }

    void audit({
      requestId: request.id,
      userId,
      tenantId: userId,
      action: AuditAction.RESOURCE_DELETED,
      resourceType: 'prompt',
      resourceId: id,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'] ?? undefined,
    });

    return sendNoContent(reply);
  });

  // Regenerate prompt with same input (useful for testing)
  fastify.post('/:id/regenerate', async (request, reply) => {
    const userId = getAuthenticatedUserId(request);
    if (!userId) {
      return sendError(reply, ERROR_CODES.UNAUTHORIZED, 'Autentikasi diperlukan', 401);
    }
    const { id } = request.params as { id: string };

    const result = await promptService.regeneratePrompt(id, userId);

    if (!result) {
      return sendError(reply, ERROR_CODES.NOT_FOUND, 'Prompt atau versi tidak ditemukan', 404);
    }

    return sendSuccess(reply, result);
  });
}
