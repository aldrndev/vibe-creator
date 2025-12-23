import { FastifyPluginAsync } from 'fastify';
import fastifyMultipart from '@fastify/multipart';
import { randomUUID } from 'crypto';
import { mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { pipeline } from 'stream/promises';
import { createWriteStream } from 'fs';

const UPLOADS_DIR = join(process.cwd(), 'uploads', 'temp');

// Ensure uploads directory exists
async function ensureUploadsDir() {
  if (!existsSync(UPLOADS_DIR)) {
    await mkdir(UPLOADS_DIR, { recursive: true });
  }
}

export const uploadRoutes: FastifyPluginAsync = async (fastify) => {
  // Register multipart
  await fastify.register(fastifyMultipart, {
    limits: {
      fileSize: 1024 * 1024 * 500, // 500 MB limit
    },
  });

  /**
   * Upload video file for processing
   */
  fastify.post('/video', async (request, reply) => {
    const user = request.user;
    if (!user) {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    try {
      await ensureUploadsDir();

      const data = await request.file();
      if (!data) {
        return reply.status(400).send({
          success: false,
          error: { code: 'NO_FILE', message: 'No file uploaded' },
        });
      }

      // Generate unique filename
      const ext = data.filename.split('.').pop() || 'mp4';
      const filename = `${randomUUID()}.${ext}`;
      const filepath = join(UPLOADS_DIR, filename);

      // Stream file to disk
      await pipeline(data.file, createWriteStream(filepath));

      return reply.send({
        success: true,
        data: {
          filename,
          filepath,
          mimetype: data.mimetype,
          size: data.file.bytesRead,
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      return reply.status(500).send({
        success: false,
        error: { code: 'UPLOAD_ERROR', message },
      });
    }
  });
};
