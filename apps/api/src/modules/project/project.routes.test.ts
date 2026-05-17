import { LifecycleStatus, ProjectMode, ProjectStatus } from '@prisma/client';
import Fastify, { type FastifyInstance, type FastifyRequest } from 'fastify';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  project: {
    create: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('@/lib/prisma', () => ({
  prisma: prismaMock,
}));

vi.mock('@/plugins/auth', () => ({
  requireAuth: async (request: FastifyRequest) => {
    request.user = {
      id: 'user-1',
      email: 'demo@vibecreator.id',
      password: 'secret-hash',
      role: 'USER',
      name: 'Demo User',
      avatarUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  },
}));

import { projectRoutes } from './project.routes';

function projectRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 'project-1',
    userId: 'user-1',
    title: 'Video Studio Draft',
    description: null,
    status: ProjectStatus.DRAFT,
    settings: {},
    mode: ProjectMode.TIMELINE,
    storyData: {},
    expiresAt: new Date('2026-05-18T00:00:00.000Z'),
    completedAt: null,
    lastOpenedAt: null,
    deletedAt: null,
    lifecycleStatus: LifecycleStatus.ACTIVE,
    createdAt: new Date('2026-05-11T00:00:00.000Z'),
    updatedAt: new Date('2026-05-11T00:00:00.000Z'),
    assets: [],
    ...overrides,
  };
}

async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  await app.register(projectRoutes, { prefix: '/projects' });
  await app.ready();
  return app;
}

describe('project routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates projects with assets included for response serialization', async () => {
    prismaMock.project.create.mockResolvedValue(projectRecord());

    const response = await app.inject({
      method: 'POST',
      url: '/projects',
      payload: {
        title: 'Video Studio Draft',
        mode: ProjectMode.TIMELINE,
        storyData: { project: { id: 'local-project' } },
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      success: true,
      data: {
        id: 'project-1',
        assets: [],
      },
    });
    expect(prismaMock.project.create).toHaveBeenCalledWith(
      expect.objectContaining({
        include: { assets: true },
      }),
    );
  });

  it('updates projects with assets included for response serialization', async () => {
    prismaMock.project.findFirst.mockResolvedValue(projectRecord());
    prismaMock.project.update.mockResolvedValue(projectRecord({ title: 'Updated Draft' }));

    const response = await app.inject({
      method: 'PATCH',
      url: '/projects/project-1',
      payload: {
        title: 'Updated Draft',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      success: true,
      data: {
        id: 'project-1',
        title: 'Updated Draft',
        assets: [],
      },
    });
    expect(prismaMock.project.update).toHaveBeenCalledWith(
      expect.objectContaining({
        include: { assets: true },
      }),
    );
  });
});
