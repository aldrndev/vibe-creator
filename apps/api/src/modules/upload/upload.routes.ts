import { randomUUID } from 'node:crypto';
import { createWriteStream, existsSync } from 'node:fs';
import { mkdir, stat, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import fastifyMultipart from '@fastify/multipart';
import { ERROR_CODES } from '@vibe-creator/shared';
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { env } from '@/config/env';
import {
  DirectorSourceLimitError,
  type DirectorSourceLimits,
  resolveDirectorSourceLimitsForActor,
  validateDirectorSourceVideo,
} from '@/modules/director/source-limits';
import { requireAuth } from '@/plugins/auth';
import { sendError } from '@/utils/response';
import {
  uploadMediaRouteSchema,
  uploadQuerySchema,
  uploadVideoRouteSchema,
} from './upload.schemas';

const UPLOADS_DIR = join(env.MEDIA_INPUT_DIR, 'temp');
const SIGNATURE_BYTES = 16;

type MediaType = 'video' | 'image' | 'audio';
type UploadPurpose = 'media' | 'ai-director';

interface AllowedUploadFormat {
  mediaType: MediaType;
  mimeType: string;
  extensions: Set<string>;
  matchesSignature: (buffer: Buffer) => boolean;
}

const ALLOWED_UPLOAD_FORMATS: AllowedUploadFormat[] = [
  {
    mediaType: 'video',
    mimeType: 'video/mp4',
    extensions: new Set(['mp4', 'm4v']),
    matchesSignature: (buffer: Buffer) =>
      buffer.length >= 12 && buffer.subarray(4, 8).toString('ascii') === 'ftyp',
  },
  {
    mediaType: 'video',
    mimeType: 'video/quicktime',
    extensions: new Set(['mov', 'qt']),
    matchesSignature: (buffer: Buffer) =>
      buffer.length >= 12 && buffer.subarray(4, 8).toString('ascii') === 'ftyp',
  },
  {
    mediaType: 'video',
    mimeType: 'video/webm',
    extensions: new Set(['webm']),
    matchesSignature: (buffer: Buffer) =>
      buffer.length >= 4 &&
      buffer[0] === 0x1a &&
      buffer[1] === 0x45 &&
      buffer[2] === 0xdf &&
      buffer[3] === 0xa3,
  },
  {
    mediaType: 'image',
    mimeType: 'image/jpeg',
    extensions: new Set(['jpg', 'jpeg']),
    matchesSignature: (buffer: Buffer) =>
      buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff,
  },
  {
    mediaType: 'image',
    mimeType: 'image/png',
    extensions: new Set(['png']),
    matchesSignature: (buffer: Buffer) =>
      buffer.length >= 8 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47,
  },
  {
    mediaType: 'image',
    mimeType: 'image/webp',
    extensions: new Set(['webp']),
    matchesSignature: (buffer: Buffer) =>
      buffer.length >= 12 &&
      buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buffer.subarray(8, 12).toString('ascii') === 'WEBP',
  },
  {
    mediaType: 'audio',
    mimeType: 'audio/mpeg',
    extensions: new Set(['mp3']),
    matchesSignature: (buffer: Buffer) =>
      buffer.length >= 3 &&
      (buffer.subarray(0, 3).toString('ascii') === 'ID3' ||
        (buffer[0] === 0xff && (buffer[1] ?? 0) >= 0xe0)),
  },
  {
    mediaType: 'audio',
    mimeType: 'audio/wav',
    extensions: new Set(['wav']),
    matchesSignature: (buffer: Buffer) =>
      buffer.length >= 12 &&
      buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buffer.subarray(8, 12).toString('ascii') === 'WAVE',
  },
  {
    mediaType: 'audio',
    mimeType: 'audio/ogg',
    extensions: new Set(['ogg']),
    matchesSignature: (buffer: Buffer) =>
      buffer.length >= 4 && buffer.subarray(0, 4).toString('ascii') === 'OggS',
  },
];

// Ensure uploads directory exists
async function ensureUploadsDir() {
  if (!existsSync(UPLOADS_DIR)) {
    await mkdir(UPLOADS_DIR, { recursive: true });
  }
}

function normalizeChunk(chunk: Buffer | string): Buffer {
  return Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
}

function getAllowedUploadFormat(
  mimetype: string,
  extension: string,
  signature: Buffer,
  allowedMediaTypes: ReadonlySet<MediaType>,
): AllowedUploadFormat | null {
  return (
    ALLOWED_UPLOAD_FORMATS.find(
      (format) =>
        allowedMediaTypes.has(format.mediaType) &&
        format.mimeType === mimetype &&
        format.extensions.has(extension) &&
        format.matchesSignature(signature),
    ) ?? null
  );
}

async function handleUploadError(
  err: unknown,
  reply: FastifyReply,
  filepath: string | null,
  uploadPurpose: UploadPurpose,
  directorLimits: DirectorSourceLimits | null,
) {
  if (filepath) {
    await unlink(filepath).catch(() => {});
  }
  if (err instanceof z.ZodError) {
    return sendError(
      reply,
      ERROR_CODES.VALIDATION_ERROR,
      err.issues[0]?.message ?? 'Invalid upload query',
      400,
    );
  }
  if (err instanceof DirectorSourceLimitError) {
    return sendError(reply, err.code, err.message, err.statusCode, err.details);
  }
  const message = err instanceof Error ? err.message : 'Upload failed';
  const normalizedMessage = message.toLowerCase();
  if (
    uploadPurpose === 'ai-director' &&
    directorLimits &&
    normalizedMessage.includes('file too large')
  ) {
    return sendError(
      reply,
      ERROR_CODES.DIRECTOR_FILE_TOO_LARGE,
      `File melebihi batas paket kamu. Maksimal ${directorLimits.maxSizeLabel} atau ${directorLimits.maxDurationLabel}. Pilih video yang lebih kecil, kompres video, atau upgrade paket.`,
      400,
      {
        minDurationMs: directorLimits.minDurationMs,
        maxDurationMs: directorLimits.maxDurationMs,
        maxSizeBytes: directorLimits.maxSizeBytes,
        maxDurationLabel: directorLimits.maxDurationLabel,
        maxSizeLabel: directorLimits.maxSizeLabel,
      },
    );
  }
  if (
    uploadPurpose === 'ai-director' &&
    (normalizedMessage.includes('aborted') ||
      normalizedMessage.includes('premature') ||
      normalizedMessage.includes('terminated') ||
      normalizedMessage.includes('unexpected end') ||
      normalizedMessage.includes('network'))
  ) {
    return sendError(
      reply,
      ERROR_CODES.DIRECTOR_UPLOAD_INTERRUPTED,
      'Upload terputus. Coba lagi dengan koneksi stabil, atau gunakan Import URL jika video tersedia di sumber yang didukung.',
      400,
    );
  }
  return sendError(reply, ERROR_CODES.INTERNAL_ERROR, message, 500);
}

async function handleUpload(
  request: FastifyRequest,
  reply: FastifyReply,
  allowedMediaTypes: ReadonlySet<MediaType>,
) {
  let filepath: string | null = null;
  let uploadPurpose: UploadPurpose = 'media';
  let directorLimits: DirectorSourceLimits | null = null;

  try {
    await ensureUploadsDir();

    const query = uploadQuerySchema.parse(request.query ?? {});
    uploadPurpose = query.purpose;

    if (uploadPurpose === 'ai-director') {
      const user = request.user;
      if (!user) {
        return sendError(reply, ERROR_CODES.UNAUTHORIZED, 'Authentication required', 401);
      }
      directorLimits = await resolveDirectorSourceLimitsForActor(user);
    }

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
    const signature = firstChunk.subarray(0, SIGNATURE_BYTES);
    const uploadFormat = getAllowedUploadFormat(data.mimetype, ext, signature, allowedMediaTypes);

    if (!uploadFormat) {
      data.file.resume();
      return sendError(reply, ERROR_CODES.INVALID_INPUT, 'Unsupported media format', 415);
    }

    const filename = `${randomUUID()}.${ext}`;
    filepath = join(UPLOADS_DIR, filename);
    let uploadedBytes = 0;

    const assertDirectorFileSize = (chunk: Buffer | string): void => {
      if (!directorLimits || uploadFormat.mediaType !== 'video') {
        return;
      }

      uploadedBytes += normalizeChunk(chunk).length;
      validateDirectorSourceVideo({
        durationSeconds: 0,
        sizeBytes: uploadedBytes,
        limits: directorLimits,
        origin: 'upload',
      });
    };

    const validatedStream = Readable.from(
      (async function* () {
        assertDirectorFileSize(firstChunk);
        yield firstChunk;
        while (true) {
          const nextChunk = await iterator.next();
          if (nextChunk.done) {
            break;
          }
          assertDirectorFileSize(nextChunk.value);
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
        mediaType: uploadFormat.mediaType,
      },
    });
  } catch (err) {
    return handleUploadError(err, reply, filepath, uploadPurpose, directorLimits);
  }
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
    async (request, reply) => handleUpload(request, reply, new Set(['video'])),
  );

  /**
   * Upload media file for export processing
   */
  fastify.post(
    '/media',
    {
      preHandler: [requireAuth],
      schema: uploadMediaRouteSchema,
    },
    async (request, reply) => handleUpload(request, reply, new Set(['video', 'image', 'audio'])),
  );
};
