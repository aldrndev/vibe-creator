import type { Prisma } from '@prisma/client';
import type {
  CreativeScanPromptInput,
  ImagePromptInput,
  PromptType,
  RelaxingPromptInput,
  ScriptPromptInput,
  TimelapsePromptInput,
  VideoGenPromptInput,
  VoicePromptInput,
} from '@vibe-creator/shared';
import {
  generateCreativeScanPrompt,
  generateImagePrompt,
  generateRelaxingPrompt,
  generateScriptPrompt,
  generateTimelapsePrompt,
  generateVideoGenPrompt,
  generateVoicePrompt,
} from '@vibe-creator/shared';
import { prisma } from '@/lib/prisma';

interface ListPromptsParams {
  userId: string;
  page: number;
  limit: number;
  type?: PromptType;
  cursor?: string;
}

interface CreatePromptParams {
  userId: string;
  type: PromptType;
  title: string;
  inputData: Record<string, unknown>;
}

interface CreateVersionParams {
  userId: string;
  promptId: string;
  inputData: Record<string, unknown>;
  userNotes?: string;
}

export const promptService = {
  /**
   * List prompts with cursor or offset pagination
   */
  async listPrompts({ userId, page, limit, type, cursor }: ListPromptsParams) {
    // Cursor pagination
    if (cursor) {
      try {
        const decoded = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as {
          id: string;
          ts: string;
        };
        const cursorDate = new Date(decoded.ts);

        const prompts = await prisma.prompt.findMany({
          where: {
            userId,
            ...(type && { type }),
            OR: [
              { createdAt: { lt: cursorDate } },
              { createdAt: cursorDate, id: { lt: decoded.id } },
            ],
          },
          include: {
            versions: {
              orderBy: { version: 'desc' },
              take: 1,
              select: { id: true, version: true, generatedPrompt: true },
            },
          },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          take: limit + 1,
        });

        const hasMore = prompts.length > limit;
        const items = hasMore ? prompts.slice(0, limit) : prompts;
        const lastItem = items[items.length - 1];
        const nextCursor =
          hasMore && lastItem
            ? Buffer.from(
                JSON.stringify({
                  id: lastItem.id,
                  ts: lastItem.createdAt.toISOString(),
                }),
              ).toString('base64url')
            : null;

        const formattedPrompts = items.map((prompt) => ({
          id: prompt.id,
          type: prompt.type,
          title: prompt.title,
          currentVersion: prompt.versions[0]?.version ?? 0,
          lastGeneratedPrompt: prompt.versions[0]?.generatedPrompt ?? null,
          createdAt: prompt.createdAt,
          updatedAt: prompt.updatedAt,
        }));

        return { data: formattedPrompts, total: 0, nextCursor, hasMore };
      } catch {
        // Invalid cursor, fall through to offset pagination
      }
    }

    // Offset pagination (default)
    const where: Prisma.PromptWhereInput = {
      userId,
      ...(type && { type }),
    };

    const [prompts, total] = await Promise.all([
      prisma.prompt.findMany({
        where,
        include: {
          versions: {
            orderBy: { version: 'desc' },
            take: 1,
            select: { id: true, version: true, generatedPrompt: true },
          },
        },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.prompt.count({ where }),
    ]);

    const formattedPrompts = prompts.map((prompt: (typeof prompts)[number]) => ({
      id: prompt.id,
      type: prompt.type,
      title: prompt.title,
      currentVersion: prompt.versions[0]?.version ?? 0,
      lastGeneratedPrompt: prompt.versions[0]?.generatedPrompt ?? null,
      createdAt: prompt.createdAt,
      updatedAt: prompt.updatedAt,
    }));

    return { data: formattedPrompts, total };
  },

  /**
   * Get single prompt details
   */
  async getPrompt(promptId: string, userId: string) {
    return prisma.prompt.findFirst({
      where: { id: promptId, userId },
      include: {
        versions: {
          orderBy: { version: 'desc' },
        },
      },
    });
  },

  /**
   * Create new prompt
   */
  async createPrompt({ userId, type, title, inputData }: CreatePromptParams) {
    const generatedPrompt = this.generatePromptFromInput(type, inputData);

    const prompt = await prisma.prompt.create({
      data: {
        userId,
        type,
        title,
        versions: {
          create: {
            version: 1,
            inputData: inputData as Prisma.InputJsonValue,
            generatedPrompt,
          },
        },
      },
      include: {
        versions: true,
      },
    });

    await prisma.prompt.update({
      where: { id: prompt.id },
      data: { currentVersionId: prompt.versions[0]?.id },
    });

    return {
      ...prompt,
      generatedPrompt,
    };
  },

  /**
   * Create new version
   */
  async createVersion({ userId, promptId, inputData, userNotes }: CreateVersionParams) {
    const prompt = await prisma.prompt.findFirst({
      where: { id: promptId, userId },
      include: {
        versions: {
          orderBy: { version: 'desc' },
          take: 1,
        },
      },
    });

    if (!prompt) return null;

    const nextVersion = (prompt.versions[0]?.version ?? 0) + 1;
    const generatedPrompt = this.generatePromptFromInput(prompt.type as PromptType, inputData);

    const version = await prisma.promptVersion.create({
      data: {
        promptId,
        version: nextVersion,
        inputData: inputData as Prisma.InputJsonValue,
        generatedPrompt,
        userNotes,
      },
    });

    await prisma.prompt.update({
      where: { id: promptId },
      data: {
        currentVersionId: version.id,
        updatedAt: new Date(),
      },
    });

    return {
      ...version,
      generatedPrompt,
    };
  },

  /**
   * Get specific version
   */
  async getVersion(promptId: string, version: number, userId: string) {
    const prompt = await prisma.prompt.findFirst({
      where: { id: promptId, userId },
    });

    if (!prompt) return null;

    return prisma.promptVersion.findFirst({
      where: {
        promptId,
        version,
      },
    });
  },

  /**
   * Update prompt title
   */
  async updatePrompt(promptId: string, userId: string, title: string) {
    const prompt = await prisma.prompt.findFirst({
      where: { id: promptId, userId },
    });

    if (!prompt) return null;

    return prisma.prompt.update({
      where: { id: promptId },
      data: { title },
    });
  },

  /**
   * Delete prompt
   */
  async deletePrompt(promptId: string, userId: string) {
    const prompt = await prisma.prompt.findFirst({
      where: { id: promptId, userId },
    });

    if (!prompt) return false;

    await prisma.prompt.delete({ where: { id: promptId } });
    return true;
  },

  /**
   * Regenerate prompt (helper)
   */
  async regeneratePrompt(promptId: string, userId: string) {
    const prompt = await prisma.prompt.findFirst({
      where: { id: promptId, userId },
      include: {
        versions: {
          orderBy: { version: 'desc' },
          take: 1,
        },
      },
    });

    if (!prompt) return null;

    const latestVersion = prompt.versions[0];
    if (!latestVersion) return null;

    const generatedPrompt = this.generatePromptFromInput(
      prompt.type as PromptType,
      latestVersion.inputData as Record<string, unknown>,
    );

    return {
      generatedPrompt,
      version: latestVersion.version,
    };
  },

  /**
   * Internal Helper: Generate prompt string
   */
  generatePromptFromInput(type: PromptType, inputData: Record<string, unknown>): string {
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
        case 'TIMELAPSE':
          return generateTimelapsePrompt(inputData as unknown as TimelapsePromptInput);
        default:
          return '// Prompt type tidak dikenali';
      }
    } catch (error) {
      return `// Error generating prompt: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`;
    }
  },
};
