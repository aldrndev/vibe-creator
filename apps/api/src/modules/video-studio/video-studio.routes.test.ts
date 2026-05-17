import Fastify, { type FastifyInstance } from 'fastify';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { videoStudioRoutes } from './video-studio.routes';

async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  await app.register(videoStudioRoutes, { prefix: '/video-studio' });
  await app.ready();
  return app;
}

describe('video studio routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('paginates the studio asset catalog', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/video-studio/assets?kind=audio&limit=50',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      success: true,
      data: {
        hasMore: true,
      },
    });
    const firstPage = response.json().data;
    expect(firstPage.items.length).toBe(50);
    expect(firstPage.nextCursor).toEqual(expect.any(String));

    const nextResponse = await app.inject({
      method: 'GET',
      url: `/video-studio/assets?kind=audio&limit=50&cursor=${firstPage.nextCursor}`,
    });

    expect(nextResponse.statusCode).toBe(200);
    const nextPage = nextResponse.json().data;
    expect(nextPage.items.length).toBeGreaterThan(0);
    expect(nextPage.items[0].id).not.toBe(firstPage.items.at(-1)?.id);
  });

  it('serializes empty-text element presets', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/video-studio/assets?kind=element&limit=50',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'highlight',
          payload: expect.objectContaining({
            kind: 'element-layer',
            text: '',
          }),
        }),
      ]),
    );
  });

  it('supports byte range requests for audio previews', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/video-studio/assets/meme-pop/preview',
      headers: {
        range: 'bytes=0-99',
      },
    });

    expect(response.statusCode).toBe(206);
    expect(response.headers['accept-ranges']).toBe('bytes');
    expect(response.headers['content-type']).toBe('audio/mpeg');
    expect(response.headers['cross-origin-resource-policy']).toBe('cross-origin');
    expect(response.headers['content-range']).toMatch(/^bytes 0-99\/\d+$/);
    expect(response.headers['content-length']).toBe('100');
  });
});
