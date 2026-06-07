import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import {
  listStudioAssetsQuerySchema,
  studioAssetErrorResponseSchema,
  studioAssetListResponseSchema,
  studioAssetParamsSchema,
  studioAssetResponseSchema,
} from './video-studio.schemas';
import {
  getStudioAsset,
  getStudioAudioAssetMimeType,
  listStudioAssets,
  materializeStudioAudioAsset,
} from './video-studio-assets.service';

interface ByteRange {
  readonly start: number;
  readonly end: number;
}

function validationMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? 'Invalid request';
}

function parseByteRange(rangeHeader: string | undefined, fileSize: number): ByteRange | null {
  if (!rangeHeader?.startsWith('bytes=')) {
    return null;
  }

  const [startPart, endPart] = rangeHeader.replace('bytes=', '').split('-', 2);
  const requestedStart = startPart ? Number.parseInt(startPart, 10) : null;
  const requestedEnd = endPart ? Number.parseInt(endPart, 10) : null;

  if (requestedStart === null && requestedEnd === null) {
    return null;
  }

  if (requestedStart === null) {
    const suffixLength = requestedEnd ?? 0;
    if (!Number.isFinite(suffixLength) || suffixLength <= 0) {
      return null;
    }

    return {
      start: Math.max(0, fileSize - suffixLength),
      end: fileSize - 1,
    };
  }

  if (!Number.isFinite(requestedStart) || requestedStart < 0 || requestedStart >= fileSize) {
    return null;
  }

  const end =
    requestedEnd === null || !Number.isFinite(requestedEnd)
      ? fileSize - 1
      : Math.min(requestedEnd, fileSize - 1);

  if (end < requestedStart) {
    return null;
  }

  return {
    start: requestedStart,
    end,
  };
}

export const videoStudioRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    '/assets',
    {
      schema: {
        tags: ['Video Studio'],
        summary: 'List Video Studio catalog assets',
        querystring: listStudioAssetsQuerySchema,
        response: {
          200: studioAssetListResponseSchema,
          400: studioAssetErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const query = listStudioAssetsQuerySchema.parse(request.query);
        return reply.send({ success: true, data: listStudioAssets(query) });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: validationMessage(error) },
          });
        }

        throw error;
      }
    },
  );

  fastify.get(
    '/assets/:id',
    {
      schema: {
        tags: ['Video Studio'],
        summary: 'Get Video Studio catalog asset',
        params: studioAssetParamsSchema,
        response: {
          200: studioAssetResponseSchema,
          404: studioAssetErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const params = studioAssetParamsSchema.parse(request.params);
      const asset = getStudioAsset(params.id);

      if (!asset) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Studio asset not found' },
        });
      }

      return reply.send({ success: true, data: asset });
    },
  );

  fastify.get(
    '/assets/:id/preview',
    {
      schema: {
        tags: ['Video Studio'],
        summary: 'Preview Video Studio audio asset',
        params: studioAssetParamsSchema,
        response: {
          200: z.unknown(),
          206: z.unknown(),
          404: studioAssetErrorResponseSchema,
          416: z.unknown(),
        },
      },
    },
    async (request, reply) => {
      const params = studioAssetParamsSchema.parse(request.params);
      const asset = getStudioAsset(params.id);

      if (asset?.kind !== 'audio') {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Studio audio asset not found' },
        });
      }

      const filePath = await materializeStudioAudioAsset(asset.id);
      const fileStats = await stat(filePath);
      const range = parseByteRange(request.headers.range, fileStats.size);
      const mimeType = getStudioAudioAssetMimeType(asset);

      if (request.headers.range && !range) {
        return reply.status(416).header('Content-Range', `bytes */${fileStats.size}`).send();
      }

      if (range) {
        const contentLength = range.end - range.start + 1;
        return reply
          .status(206)
          .type(mimeType)
          .header('Accept-Ranges', 'bytes')
          .header('Content-Length', contentLength)
          .header('Content-Range', `bytes ${range.start}-${range.end}/${fileStats.size}`)
          .header('Cache-Control', 'public, max-age=86400')
          .header('Cross-Origin-Resource-Policy', 'cross-origin')
          .header('X-Content-Type-Options', 'nosniff')
          .send(createReadStream(filePath, { start: range.start, end: range.end }));
      }

      return reply
        .type(mimeType)
        .header('Accept-Ranges', 'bytes')
        .header('Content-Length', fileStats.size)
        .header('Cache-Control', 'public, max-age=86400')
        .header('Cross-Origin-Resource-Policy', 'cross-origin')
        .header('X-Content-Type-Options', 'nosniff')
        .send(createReadStream(filePath));
    },
  );
};
