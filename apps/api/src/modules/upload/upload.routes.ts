import { randomUUID } from 'node:crypto';
import { createWriteStream, existsSync } from 'node:fs';
import { mkdir, stat, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import fastifyMultipart from '@fastify/multipart';
import { ERROR_CODES } from '@vibe-creator/shared';
import type { FastifyPluginAsync } from 'fastify';
import { env } from '@/config/env';
import { requireAuth } from '@/plugins/auth';
import { sendError } from '@/utils/response';
import { uploadVideoRouteSchema } from './upload.schemas';

const UPLOADS_DIR = join(env.MEDIA_INPUT_DIR, 'temp');
const VIDEO_SIGNATURE_BYTES = 16;

const ALLOWED_VIDEO_FORMATS = [
  {
    mimeType: 'video/mp4',
    extensions: new Set(['mp4', 'm4v']),
    matchesSignature: (buffer: Buffer) =>
      buffer.length >= 12 && buffer.subarray(4, 8).toString('ascii') === 'ftyp',
  },
  {
    mimeType: 'video/quicktime',
    extensions: new Set(['mov', 'qt']),
    matchesSignature: (buffer: Buffer) =>
      buffer.length >= 12 && buffer.subarray(4, 8).toString('ascii') === 'ftyp',
  },
  {
    mimeType: 'video/webm',
    extensions: new Set(['webm']),
    matchesSignature: (buffer: Buffer) =>
      buffer.length >= 4 &&
      buffer[0] === 0x1a &&
      buffer[1] === 0x45 &&
      buffer[2] === 0xdf &&
      buffer[3] === 0xa3,
  },
] as const;

// Ensure uploads directory exists
async function ensureUploadsDir() {
  if (!existsSync(UPLOADS_DIR)) {
    await mkdir(UPLOADS_DIR, { recursive: true });
  }
}

function normalizeChunk(chunk: Buffer | string): Buffer {
  return Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
}

function isAllowedVideoUpload(mimetype: string, extension: string, signature: Buffer): boolean {
  return ALLOWED_VIDEO_FORMATS.some(
    (format) =>
      format.mimeType === mimetype &&
      format.extensions.has(extension) &&
      format.matchesSignature(signature),
  );
}

export const uploadRoutes: FastifyPluginAsync = async (fastify) => {
  // Register multipart
  await fastify.register(fastifyMultipart, {
    limits: {
      fileSize: 1024 * 1024 * env.MAX_UPLOAD_SIZE_MB,
    },
  });

  /**
   * Upload video file for processing
   */
  fastify.post(
    '/video',
    {
      preHandler: [requireAuth],
      schema: uploadVideoRouteSchema,
    },
    async (request, reply) => {
      let filepath: string | null = null;
      try {
        await ensureUploadsDir();

        const data = await request.file();
        if (!data) {
          return reply.status(400).send({
            success: false,
            error: { code: 'NO_FILE', message: 'No file uploaded' },
          });
        }

        const ext = data.filename.split('.').pop()?.toLowerCase();
        if (!ext) {
          data.file.resume();
          return sendError(reply, ERROR_CODES.INVALID_INPUT, 'File extension is required', 400);
        }

        const iterator = data.file[Symbol.asyncIterator]();
        const firstChunkResult = await iterator.next();
        if (firstChunkResult.done) {
          return sendError(reply, ERROR_CODES.INVALID_INPUT, 'Uploaded file is empty', 400);
        }

        const firstChunk = normalizeChunk(firstChunkResult.value);
        const signature = firstChunk.subarray(0, VIDEO_SIGNATURE_BYTES);
        if (!isAllowedVideoUpload(data.mimetype, ext, signature)) {
          data.file.resume();
          return sendError(reply, ERROR_CODES.INVALID_INPUT, 'Unsupported video format', 415);
        }

        const filename = `${randomUUID()}.${ext}`;
        filepath = join(UPLOADS_DIR, filename);

        // Stream file to disk after validating the initial bytes.
        const validatedStream = Readable.from(
          (async function* () {
            yield firstChunk;
            while (true) {
              const nextChunk = await iterator.next();
              if (nextChunk.done) {
                break;
              }
              yield nextChunk.value;
            }
          })(),
        );

        await pipeline(validatedStream, createWriteStream(filepath));
        const fileStats = await stat(filepath);

        return reply.send({
          success: true,
          data: {
            filename,
            uploadToken: filename,
            mimetype: data.mimetype,
            size: fileStats.size,
          },
        });
      } catch (err) {
        if (filepath) {
          await unlink(filepath).catch(() => {});
        }
        const message = err instanceof Error ? err.message : 'Upload failed';
        return sendError(reply, ERROR_CODES.INTERNAL_ERROR, message, 500);
      }
    },
  );
};
