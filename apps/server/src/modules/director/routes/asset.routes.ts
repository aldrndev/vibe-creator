import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { join } from "path";
import { env } from "@/config/env";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { directorService } from "../director.service";
import fastifyStatic from "@fastify/static";

const importAssetSchema = z
  .object({
    type: z.enum(["url", "file"]),
    url: z.string().url().optional(),
    filePath: z.string().optional(),
  })
  .refine(
    (data) =>
      (data.type === "url" && !!data.url) ||
      (data.type === "file" && !!data.filePath),
    {
      message: "URL required for type 'url', filePath required for type 'file'",
    }
  );

export const assetRoutes: FastifyPluginAsync = async (fastify) => {
  // Register fastify-static to support Range requests (seeking)
  // Root: /uploads/director (mapped via MEDIA_INPUT_DIR)
  fastify.register(fastifyStatic, {
    root: join(env.MEDIA_INPUT_DIR, "director"),
    prefix: "/static-assets/",
    decorateReply: true,
  });

  /**
   * Get asset status (polling for progress)
   */
  fastify.get<{ Params: { id: string } }>(
    "/assets/:id/status",
    async (request, reply) => {
      const { id } = request.params;
      const user = request.user;
      if (!user) {
        return reply.status(401).send({
          success: false,
          error: { code: "UNAUTHORIZED", message: "Auth required" },
        });
      }

      try {
        // Check local Redis for progress
        const { redis } = await import("@/lib/redis");

        // Check DB for status first
        const asset = await prisma.directorAsset.findUnique({ where: { id } });
        if (!asset) {
          return reply.status(404).send({
            success: false,
            error: { code: "NOT_FOUND", message: "Asset not found" },
          });
        }

        let progress = 0;
        let errorMessage = null;

        if (asset.ingestStatus === "UPLOADING") {
          // Check Redis for active progress
          const progressKey = `director:asset:${id}:progress`;
          const rawProgress = await redis.get(progressKey);

          if (rawProgress) {
            progress = parseInt(rawProgress, 10);
          } else {
            // No progress key found. Check if asset is stale (zombie job)
            const now = new Date();
            const staleThreshold = 2 * 60 * 1000; // 2 minutes
            if (now.getTime() - asset.createdAt.getTime() > staleThreshold) {
              // Auto-fail the asset
              await prisma.directorAsset.update({
                where: { id },
                data: { ingestStatus: "FAILED" },
              });
              return reply.send({
                success: true,
                data: {
                  id: asset.id,
                  status: "FAILED",
                  progress: 0,
                  errorMessage: "Upload timed out or server restarted",
                },
              });
            }
          }

          const errorKey = `director:asset:${id}:error`;
          const redisError = await redis.get(errorKey);
          if (redisError) {
            errorMessage = redisError;
          }
        } else if (asset.ingestStatus === "READY") {
          progress = 100;
        }

        return reply.send({
          success: true,
          data: {
            id: asset.id,
            status: asset.ingestStatus,
            progress,
            errorMessage,
          },
        });
      } catch {
        return reply.status(500).send({
          success: false,
          error: { code: "INTERNAL_ERROR", message: "Failed to get status" },
        });
      }
    }
  );

  /**
   * Import from URL
   */
  fastify.post<{ Params: { id: string } }>(
    "/sessions/:id/import",
    async (request, reply) => {
      const user = request.user;
      if (!user) {
        return reply.status(401).send({
          success: false,
          error: { code: "UNAUTHORIZED", message: "Authentication required" },
        });
      }

      try {
        const body = importAssetSchema.parse(request.body);
        const asset = await directorService.importAsset(
          request.params.id,
          user.id,
          body
        );
        return reply.status(201).send({
          success: true,
          data: asset,
        });
      } catch (err) {
        logger.error({ err }, "Import failed");
        if (err instanceof z.ZodError) {
          return reply.status(400).send({
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: err.errors[0]?.message,
            },
          });
        }
        const message = err instanceof Error ? err.message : "Import failed";
        const code = message.includes("not supported")
          ? "UNSUPPORTED_SOURCE"
          : message.includes("Invalid URL")
          ? "INVALID_URL"
          : "IMPORT_FAILED";
        return reply.status(400).send({
          success: false,
          error: { code, message },
        });
      }
    }
  );

  /**
   * Get asset info
   */
  fastify.get<{ Params: { id: string } }>(
    "/sessions/:id/asset",
    async (request, reply) => {
      const user = request.user;
      if (!user) {
        return reply.status(401).send({
          success: false,
          error: { code: "UNAUTHORIZED", message: "Authentication required" },
        });
      }

      try {
        const asset = await directorService.getAsset(
          request.params.id,
          user.id
        );
        return reply.send({
          success: true,
          data: asset,
        });
      } catch {
        return reply.status(404).send({
          success: false,
          error: { code: "ASSET_MISSING", message: "Asset not found" },
        });
      }
    }
  );

  /**
   * Serve asset file (video)
   */
  fastify.get<{ Params: { id: string } }>(
    "/sessions/:id/asset/stream",
    async (request, reply) => {
      const user = request.user;
      if (!user) {
        return reply.status(401).send({
          success: false,
          error: { code: "UNAUTHORIZED", message: "Authentication required" },
        });
      }

      try {
        const asset = await directorService.getAsset(
          request.params.id,
          user.id
        );

        if (!asset.storageKey) {
          return reply.status(404).send({
            success: false,
            error: {
              code: "ASSET_PENDING",
              message: "Asset processing/uploading",
            },
          });
        }

        const fileName = asset.storageKey.split("/").pop()!;
        const filePath = join(env.MEDIA_INPUT_DIR, "director", fileName);

        // Simple file existence check
        const fs = await import("fs/promises");
        try {
          await fs.access(filePath);
        } catch {
          return reply.status(404).send({
            success: false,
            error: {
              code: "FILE_MISSING",
              message: "Asset file not found on server",
            },
          });
        }

        // Send file with correct mime type (fastify-static handles Range)
        return reply.type(asset.mimeType).sendFile(fileName);
      } catch {
        return reply.status(404).send({
          success: false,
          error: { code: "NOT_FOUND", message: "Session or asset not found" },
        });
      }
    }
  );

  /**
   * Serve preview images
   */
  fastify.get<{ Params: { filename: string } }>(
    "/previews/:filename",
    async (request, reply) => {
      try {
        const { filename } = request.params;

        // Security: Only allow specific file extensions
        if (!/^preview_[a-f0-9-]+\.(jpg|png)$/.test(filename)) {
          return reply.status(400).send({
            success: false,
            error: {
              code: "INVALID_FILENAME",
              message: "Invalid preview filename",
            },
          });
        }

        // Construct file path
        const filePath = join(
          env.MEDIA_INPUT_DIR,
          "director",
          "previews",
          filename
        );

        // Check if file exists
        const fs = await import("fs/promises");
        try {
          await fs.access(filePath);
        } catch {
          return reply.status(404).send({
            success: false,
            error: { code: "NOT_FOUND", message: "Preview not found" },
          });
        }

        // Send file
        return reply.type("image/jpeg").sendFile(join("previews", filename));
      } catch (err) {
        logger.error({ err }, "Failed to serve preview");
        return reply.status(500).send({
          success: false,
          error: { code: "SERVER_ERROR", message: "Failed to serve preview" },
        });
      }
    }
  );
};
