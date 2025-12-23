import type { FastifyInstance } from 'fastify';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { sendSuccess, sendError, sendCreated, sendPaginated, sendNoContent } from '@/utils/response';
import { requireAuth } from '@/plugins/auth';
import { ERROR_CODES, DEFAULT_PAGE, DEFAULT_LIMIT, MAX_LIMIT } from '@vibe-creator/shared';
import { 
  generateScriptPrompt,
  generateVoicePrompt,
  generateVideoGenPrompt,
  generateImagePrompt,
  generateRelaxingPrompt,
  generateCreativeScanPrompt,
} from '@vibe-creator/shared';
import type { 
  PromptType, 
  ScriptPromptInput,
  VoicePromptInput,
  VideoGenPromptInput,
  ImagePromptInput,
  RelaxingPromptInput,
  CreativeScanPromptInput,
} from '@vibe-creator/shared';

// Validation schemas
const promptTypeSchema = z.enum([
  'SCRIPT',
  'VOICE',
  'VIDEO_GEN',
  'IMAGE',
  'RELAXING',
  'CREATIVE_SCAN',
]);

const createPromptSchema = z.object({
  type: promptTypeSchema,
  title: z.string().min(1, 'Judul diperlukan').max(200),
  inputData: z.record(z.unknown()),
});

const createVersionSchema = z.object({
  inputData: z.record(z.unknown()),
  userNotes: z.string().optional(),
});

const listQuerySchema = z.object({
  page: z.coerce.number().min(1).default(DEFAULT_PAGE),
  limit: z.coerce.number().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT),
  type: promptTypeSchema.optional(),
});

interface PromptWithVersions {
  id: string;
  type: string;
  title: string;
  currentVersionId: string | null;
  createdAt: Date;
  updatedAt: Date;
  versions: Array<{
    id: string;
    version: number;
    generatedPrompt: string;
  }>;
}

export async function promptRoutes(fastify: FastifyInstance): Promise<void> {
  // All routes require authentication
  fastify.addHook('preHandler', requireAuth);

  // List prompts
  fastify.get('/', async (request, reply) => {
    const userId = request.user!.id;
    const query = listQuerySchema.parse(request.query);
    
    const where = {
      userId,
      ...(query.type && { type: query.type }),
    };

    const [prompts, total] = await Promise.all([
      prisma.prompt.findMany({
        where,
        include: {
          versions: {
            orderBy: { version: 'desc' as const },
            take: 1,
            select: {
              id: true,
              version: true,
              generatedPrompt: true,
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      prisma.prompt.count({ where }),
    ]);

    const formattedPrompts = (prompts as PromptWithVersions[]).map((prompt) => ({
      id: prompt.id,
      type: prompt.type,
      title: prompt.title,
      currentVersion: prompt.versions[0]?.version ?? 0,
      lastGeneratedPrompt: prompt.versions[0]?.generatedPrompt ?? null,
      createdAt: prompt.createdAt,
      updatedAt: prompt.updatedAt,
    }));

    return sendPaginated(reply, formattedPrompts, total, query.page, query.limit);
  });

  // Get single prompt with all versions
  fastify.get('/:id', async (request, reply) => {
    const userId = request.user!.id;
    const { id } = request.params as { id: string };

    const prompt = await prisma.prompt.findFirst({
      where: { id, userId },
      include: {
        versions: {
          orderBy: { version: 'desc' },
        },
      },
    });

    if (!prompt) {
      return sendError(reply, ERROR_CODES.NOT_FOUND, 'Prompt tidak ditemukan', 404);
    }

    return sendSuccess(reply, prompt);
  });

  // Create new prompt
  fastify.post('/', async (request, reply) => {
    const userId = request.user!.id;
    const body = createPromptSchema.parse(request.body);

    // Generate the prompt using template
    const generatedPrompt = generatePromptFromInput(
      body.type,
      body.inputData as Record<string, unknown>
    );

    // Create prompt with first version
    const prompt = await prisma.prompt.create({
      data: {
        userId,
        type: body.type,
        title: body.title,
        versions: {
          create: {
            version: 1,
            inputData: body.inputData as Prisma.InputJsonValue,
            generatedPrompt,
          },
        },
      },
      include: {
        versions: true,
      },
    });

    // Update currentVersionId
    await prisma.prompt.update({
      where: { id: prompt.id },
      data: { currentVersionId: prompt.versions[0]?.id },
    });

    return sendCreated(reply, {
      ...prompt,
      generatedPrompt,
    });
  });

  // Create new version of existing prompt
  fastify.post('/:id/versions', async (request, reply) => {
    const userId = request.user!.id;
    const { id } = request.params as { id: string };
    const body = createVersionSchema.parse(request.body);

    // Find existing prompt
    const prompt = await prisma.prompt.findFirst({
      where: { id, userId },
      include: {
        versions: {
          orderBy: { version: 'desc' },
          take: 1,
        },
      },
    });

    if (!prompt) {
      return sendError(reply, ERROR_CODES.NOT_FOUND, 'Prompt tidak ditemukan', 404);
    }

    const nextVersion = (prompt.versions[0]?.version ?? 0) + 1;

    // Generate the prompt using template
    const generatedPrompt = generatePromptFromInput(
      prompt.type as PromptType,
      body.inputData as Record<string, unknown>
    );

    // Create new version
    const version = await prisma.promptVersion.create({
      data: {
        promptId: id,
        version: nextVersion,
        inputData: body.inputData as Prisma.InputJsonValue,
        generatedPrompt,
        userNotes: body.userNotes,
      },
    });

    // Update prompt
    await prisma.prompt.update({
      where: { id },
      data: { 
        currentVersionId: version.id,
        updatedAt: new Date(),
      },
    });

    return sendCreated(reply, {
      ...version,
      generatedPrompt,
    });
  });

  // Get specific version
  fastify.get('/:id/versions/:version', async (request, reply) => {
    const userId = request.user!.id;
    const { id, version } = request.params as { id: string; version: string };

    const prompt = await prisma.prompt.findFirst({
      where: { id, userId },
    });

    if (!prompt) {
      return sendError(reply, ERROR_CODES.NOT_FOUND, 'Prompt tidak ditemukan', 404);
    }

    const promptVersion = await prisma.promptVersion.findFirst({
      where: {
        promptId: id,
        version: parseInt(version, 10),
      },
    });

    if (!promptVersion) {
      return sendError(reply, ERROR_CODES.NOT_FOUND, 'Versi tidak ditemukan', 404);
    }

    return sendSuccess(reply, promptVersion);
  });

  // Update prompt title
  fastify.patch('/:id', async (request, reply) => {
    const userId = request.user!.id;
    const { id } = request.params as { id: string };
    const body = z.object({ title: z.string().min(1).max(200) }).parse(request.body);

    const prompt = await prisma.prompt.findFirst({
      where: { id, userId },
    });

    if (!prompt) {
      return sendError(reply, ERROR_CODES.NOT_FOUND, 'Prompt tidak ditemukan', 404);
    }

    const updated = await prisma.prompt.update({
      where: { id },
      data: { title: body.title },
    });

    return sendSuccess(reply, updated);
  });

  // Delete prompt
  fastify.delete('/:id', async (request, reply) => {
    const userId = request.user!.id;
    const { id } = request.params as { id: string };

    const prompt = await prisma.prompt.findFirst({
      where: { id, userId },
    });

    if (!prompt) {
      return sendError(reply, ERROR_CODES.NOT_FOUND, 'Prompt tidak ditemukan', 404);
    }

    await prisma.prompt.delete({ where: { id } });

    return sendNoContent(reply);
  });

  // Regenerate prompt with same input (useful for testing)
  fastify.post('/:id/regenerate', async (request, reply) => {
    const userId = request.user!.id;
    const { id } = request.params as { id: string };

    const prompt = await prisma.prompt.findFirst({
      where: { id, userId },
      include: {
        versions: {
          orderBy: { version: 'desc' },
          take: 1,
        },
      },
    });

    if (!prompt) {
      return sendError(reply, ERROR_CODES.NOT_FOUND, 'Prompt tidak ditemukan', 404);
    }

    const latestVersion = prompt.versions[0];
    if (!latestVersion) {
      return sendError(reply, ERROR_CODES.NOT_FOUND, 'Tidak ada versi yang ditemukan', 404);
    }

    // Regenerate with same input
    const generatedPrompt = generatePromptFromInput(
      prompt.type as PromptType,
      latestVersion.inputData as Record<string, unknown>
    );

    return sendSuccess(reply, {
      generatedPrompt,
      version: latestVersion.version,
    });
  });
}

/**
 * Generate prompt from input data using the appropriate template generator
 */
function generatePromptFromInput(type: PromptType, inputData: Record<string, unknown>): string {
  try {
    switch (type) {
      case 'SCRIPT':
        return generateScriptPrompt(inputData as unknown as ScriptPromptInput);
      case 'VOICE':
        return generateVoicePrompt(inputData as unknown as VoicePromptInput);
      case 'VIDEO_GEN':
        return generateVideoGenPrompt(inputData as unknown as VideoGenPromptInput);
      case 'IMAGE':
        return generateImagePrompt(inputData as unknown as ImagePromptInput);
      case 'RELAXING':
        return generateRelaxingPrompt(inputData as unknown as RelaxingPromptInput);
      case 'CREATIVE_SCAN':
        return generateCreativeScanPrompt(inputData as unknown as CreativeScanPromptInput);
      default:
        return `// Prompt type tidak dikenali`;
    }
  } catch (error) {
    return `// Error generating prompt: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}
