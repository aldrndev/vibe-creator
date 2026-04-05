import rateLimit from '@fastify/rate-limit';
import Fastify, { type FastifyInstance, type FastifyRequest } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { canAccessPreviewFile } from '@/modules/director/preview-access';

const { redisMock, directorRepoMock } = vi.hoisted(() => ({
  redisMock: {
    get: vi.fn(),
  },
  directorRepoMock: {
    findAssetByIdForUser: vi.fn(),
    updateAsset: vi.fn(),
  },
}));

vi.mock('@/lib/redis', () => ({
  redis: redisMock,
}));

vi.mock('@/modules/director/director.repo', () => ({
  directorRepo: directorRepoMock,
}));

vi.mock('@/modules/director/director.service', () => ({
  directorService: {},
}));

vi.mock('@/plugins/auth', () => ({
  requireAuth: () => undefined,
}));

import { assetRoutes } from '@/modules/director/routes/asset.routes';

async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });

  await app.register(rateLimit, {
    max: 1,
    timeWindow: '1 minute',
  });

  app.addHook('preHandler', async (request: FastifyRequest) => {
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
  });

  await app.register(assetRoutes, { prefix: '/director' });
  await app.ready();
  return app;
}

describe('director asset status route', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    redisMock.get.mockResolvedValue(null);
    directorRepoMock.findAssetByIdForUser.mockResolvedValue({
      id: 'asset-1',
      ingestStatus: 'READY',
      createdAt: new Date(),
    });
  });

  it('allows repeated polling without tripping the global rate limit', async () => {
    const firstResponse = await app.inject({
      method: 'GET',
      url: '/director/assets/asset-1/status',
    });

    const secondResponse = await app.inject({
      method: 'GET',
      url: '/director/assets/asset-1/status',
    });

    expect(firstResponse.statusCode).toBe(200);
    expect(secondResponse.statusCode).toBe(200);
  });

  it('returns zero progress for fresh uploading assets without a redis progress key', async () => {
    directorRepoMock.findAssetByIdForUser.mockResolvedValue({
      id: 'asset-1',
      ingestStatus: 'UPLOADING',
      createdAt: new Date(),
    });

    const response = await app.inject({
      method: 'GET',
      url: '/director/assets/asset-1/status',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      success: true,
      data: {
        id: 'asset-1',
        status: 'UPLOADING',
        progress: 0,
      },
    });
  });

  it('allows preview access for reused analysis candidates', () => {
    const canAccess = canAccessPreviewFile(
      'preview_12345678-1234-1234-1234-123456789abc.jpg',
      [],
      [],
      [
        {
          previewStorageKey: 'director/previews/preview_12345678-1234-1234-1234-123456789abc.jpg',
        },
      ],
    );

    expect(canAccess).toBe(true);
  });
});
