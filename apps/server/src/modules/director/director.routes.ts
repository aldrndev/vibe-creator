import { env } from "@/config/env";
import { prisma } from "@/lib/prisma";
import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { join } from "path";
import { directorService } from "./director.service";
import fastifyStatic from "@fastify/static";
import { logger } from "@/lib/logger";

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

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

const selectClipsSchema = z.object({
  clipIds: z.array(z.string()),
});

const updateClipSchema = z.object({
  trimStartMs: z.number().min(0).optional(),
  trimEndMs: z.number().min(0).optional(),
  orderIndex: z.number().min(0).optional(),
});

const updateSubtitleStyleSchema = z.object({
  fontToken: z.string().optional(),
  textColorToken: z.string().optional(),
  bgColorToken: z.string().optional(),
  fontSize: z.number().min(8).max(72).optional(),
  position: z.enum(["top", "center", "bottom"]).optional(),
  animation: z.enum(["none", "fade", "typewriter"]).optional(),
});

const startExportSchema = z.object({
  aspectRatio: z.enum(["9:16", "16:9", "1:1"]).optional(),
  quality: z.enum(["720p", "1080p"]).optional(),
  includeSubtitles: z.boolean().optional(),
});

const updateTranscriptSchema = z.object({
  segments: z.array(
    z.object({
      startMs: z.number(),
      endMs: z.number(),
      text: z.string(),
    })
  ),
});

// =============================================================================
// ROUTES
// =============================================================================

export const directorRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * Create new director session
   */
  fastify.post("/sessions", async (request, reply) => {
    const user = request.user;
    if (!user) {
      return reply.status(401).send({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Authentication required" },
      });
    }

    try {
      const session = await directorService.createSession(user.id);
      return reply.status(201).send({
        success: true,
        data: session,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create session";
      return reply.status(400).send({
        success: false,
        error: { code: "CREATE_FAILED", message },
      });
    }
  });

  // Register fastify-static to support Range requests (seeking)
  // Root: /uploads/director (mapped via MEDIA_INPUT_DIR)
  fastify.register(fastifyStatic, {
    root: join(env.MEDIA_INPUT_DIR, "director"),
    prefix: "/director/static-assets/",
    decorateReply: true,
  });

  /**
   * Get asset status (polling for progress)
   */
  fastify.get("/assets/:id/status", async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = request.user;
    if (!user) {
      return reply.status(401).send({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Auth required" },
      });
    }

    try {
      // Check local Redis for progress
      // Use dynamic import or existing redis instance if available - routes usually don't have direct access unless imported.
      // Assuming redis is available in @/lib/redis
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
          // If created more than 2 minutes ago and still UPLOADING with no progress key, it likely died (e.g. server restart)
          const now = new Date();
          const staleThreshold = 2 * 60 * 1000; // 2 minutes
          if (now.getTime() - asset.createdAt.getTime() > staleThreshold) {
            // Auto-fail the asset
            await prisma.directorAsset.update({
              where: { id },
              data: { ingestStatus: "FAILED" },
            });
            errorMessage = "Upload timed out or server restarted";
            asset.ingestStatus = "FAILED" as any; // Update local var for response
          }
        }

        const errorKey = `director:asset:${id}:error`;
        const redisError = await redis.get(errorKey);
        if (redisError) errorMessage = redisError;
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
    } catch (err) {
      return reply.status(500).send({
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Failed to get status" },
      });
    }
  });

  /**
   * Get session details
   */
  fastify.get<{ Params: { id: string } }>(
    "/sessions/:id",
    async (request, reply) => {
      const user = request.user;
      if (!user) {
        return reply.status(401).send({
          success: false,
          error: { code: "UNAUTHORIZED", message: "Authentication required" },
        });
      }

      try {
        const session = await directorService.getSession(
          request.params.id,
          user.id
        );
        return reply.send({
          success: true,
          data: session,
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Session not found";
        const code = message.includes("not found") ? "NOT_FOUND" : "FORBIDDEN";
        return reply.status(code === "NOT_FOUND" ? 404 : 403).send({
          success: false,
          error: { code, message },
        });
      }
    }
  );

  /**
   * Delete session
   */
  fastify.delete<{ Params: { id: string } }>(
    "/sessions/:id",
    async (request, reply) => {
      const user = request.user;
      if (!user) {
        return reply.status(401).send({
          success: false,
          error: { code: "UNAUTHORIZED", message: "Authentication required" },
        });
      }

      try {
        await directorService.deleteSession(request.params.id, user.id);
        return reply.send({
          success: true,
          data: { deleted: true },
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Delete failed";
        return reply.status(404).send({
          success: false,
          error: { code: "NOT_FOUND", message },
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

        // Send file with correct mime type
        // Send file with correct mime type (fastify-static handles Range)
        const filename = asset.storageKey.split("/").pop()!;
        return reply.type(asset.mimeType).sendFile(filename);
      } catch (err) {
        return reply.status(404).send({
          success: false,
          error: { code: "NOT_FOUND", message: "Session or asset not found" },
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
      } catch (err) {
        return reply.status(404).send({
          success: false,
          error: { code: "ASSET_MISSING", message: "Asset not found" },
        });
      }
    }
  );

  /**
   * Start analysis
   */
  fastify.post<{ Params: { id: string } }>(
    "/sessions/:id/analyze",
    async (request, reply) => {
      const user = request.user;
      if (!user) {
        return reply.status(401).send({
          success: false,
          error: { code: "UNAUTHORIZED", message: "Authentication required" },
        });
      }

      try {
        const job = await directorService.startAnalysis(
          request.params.id,
          user.id
        );
        return reply.status(202).send({
          success: true,
          data: job,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Analysis failed";
        return reply.status(400).send({
          success: false,
          error: { code: "ANALYSIS_FAILED", message },
        });
      }
    }
  );

  /**
   * Get analysis status & results
   */
  fastify.get<{ Params: { id: string } }>(
    "/sessions/:id/analyze",
    async (request, reply) => {
      const user = request.user;
      if (!user) {
        return reply.status(401).send({
          success: false,
          error: { code: "UNAUTHORIZED", message: "Authentication required" },
        });
      }

      try {
        const result = await directorService.getAnalysisResult(
          request.params.id,
          user.id
        );
        return reply.send({
          success: true,
          data: result,
        });
      } catch (err) {
        return reply.status(404).send({
          success: false,
          error: { code: "NOT_FOUND", message: "Analysis not found" },
        });
      }
    }
  );

  /**
   * Select clips
   */
  fastify.post<{ Params: { id: string } }>(
    "/sessions/:id/clips",
    async (request, reply) => {
      const user = request.user;
      if (!user) {
        return reply.status(401).send({
          success: false,
          error: { code: "UNAUTHORIZED", message: "Authentication required" },
        });
      }

      try {
        const body = selectClipsSchema.parse(request.body);
        const clips = await directorService.selectClips(
          request.params.id,
          user.id,
          body.clipIds
        );
        return reply.send({
          success: true,
          data: clips,
        });
      } catch (err) {
        if (err instanceof z.ZodError) {
          return reply.status(400).send({
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: err.errors[0]?.message,
            },
          });
        }
        const message = err instanceof Error ? err.message : "Selection failed";
        return reply.status(400).send({
          success: false,
          error: { code: "SELECTION_FAILED", message },
        });
      }
    }
  );

  /**
   * Get selected clips
   */
  fastify.get<{ Params: { id: string } }>(
    "/sessions/:id/clips",
    async (request, reply) => {
      const user = request.user;
      if (!user) {
        return reply.status(401).send({
          success: false,
          error: { code: "UNAUTHORIZED", message: "Authentication required" },
        });
      }

      try {
        const clips = await directorService.getSelectedClips(
          request.params.id,
          user.id
        );
        return reply.send({
          success: true,
          data: clips,
        });
      } catch (err) {
        return reply.status(404).send({
          success: false,
          error: { code: "NOT_FOUND", message: "Clips not found" },
        });
      }
    }
  );

  /**
   * Update clip
   */
  fastify.patch<{ Params: { id: string; clipId: string } }>(
    "/sessions/:id/clips/:clipId",
    async (request, reply) => {
      const user = request.user;
      if (!user) {
        return reply.status(401).send({
          success: false,
          error: { code: "UNAUTHORIZED", message: "Authentication required" },
        });
      }

      try {
        const body = updateClipSchema.parse(request.body);
        const clip = await directorService.updateClip(
          request.params.id,
          user.id,
          request.params.clipId,
          body
        );
        return reply.send({
          success: true,
          data: clip,
        });
      } catch (err) {
        if (err instanceof z.ZodError) {
          return reply.status(400).send({
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: err.errors[0]?.message,
            },
          });
        }
        const message = err instanceof Error ? err.message : "Update failed";
        return reply.status(400).send({
          success: false,
          error: { code: "UPDATE_FAILED", message },
        });
      }
    }
  );

  /**
   * Update clip transcript
   */
  fastify.patch<{ Params: { id: string; clipId: string } }>(
    "/sessions/:id/clips/:clipId/transcript",
    async (request, reply) => {
      const user = request.user;
      if (!user) {
        return reply.status(401).send({
          success: false,
          error: { code: "UNAUTHORIZED", message: "Authentication required" },
        });
      }

      try {
        const body = updateTranscriptSchema.parse(request.body);
        const transcript = await directorService.updateClipTranscript(
          request.params.id,
          user.id,
          request.params.clipId,
          body.segments
        );
        return reply.send({
          success: true,
          data: transcript,
        });
      } catch (err) {
        if (err instanceof z.ZodError) {
          return reply.status(400).send({
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: err.errors[0]?.message,
            },
          });
        }
        const message = err instanceof Error ? err.message : "Update failed";
        return reply.status(400).send({
          success: false,
          error: { code: "UPDATE_FAILED", message },
        });
      }
    }
  );

  /**
   * Start transcription
   */
  fastify.post<{ Params: { id: string } }>(
    "/sessions/:id/transcribe",
    async (request, reply) => {
      const user = request.user;
      if (!user) {
        return reply.status(401).send({
          success: false,
          error: { code: "UNAUTHORIZED", message: "Authentication required" },
        });
      }

      try {
        const job = await directorService.startTranscribe(
          request.params.id,
          user.id
        );
        return reply.status(202).send({
          success: true,
          data: job,
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Transcription failed";
        return reply.status(400).send({
          success: false,
          error: { code: "TRANSCRIBE_FAILED", message },
        });
      }
    }
  );

  /**
   * Get transcription status & result
   */
  fastify.get<{ Params: { id: string } }>(
    "/sessions/:id/transcribe",
    async (request, reply) => {
      const user = request.user;
      if (!user) {
        return reply.status(401).send({
          success: false,
          error: { code: "UNAUTHORIZED", message: "Authentication required" },
        });
      }

      try {
        const result = await directorService.getTranscribeResult(
          request.params.id,
          user.id
        );
        // result can be null if no transcription started yet
        return reply.send({
          success: true,
          data: result,
        });
      } catch (err) {
        // Only 404 if session not found
        return reply.status(404).send({
          success: false,
          error: { code: "NOT_FOUND", message: "Session not found" },
        });
      }
    }
  );

  /**
   * Update subtitle style
   */
  fastify.patch<{ Params: { id: string } }>(
    "/sessions/:id/subtitle",
    async (request, reply) => {
      const user = request.user;
      if (!user) {
        return reply.status(401).send({
          success: false,
          error: { code: "UNAUTHORIZED", message: "Authentication required" },
        });
      }

      try {
        const body = updateSubtitleStyleSchema.parse(request.body);
        const style = await directorService.updateSubtitleStyle(
          request.params.id,
          user.id,
          body
        );
        return reply.send({
          success: true,
          data: style,
        });
      } catch (err) {
        if (err instanceof z.ZodError) {
          return reply.status(400).send({
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: err.errors[0]?.message,
            },
          });
        }
        const message = err instanceof Error ? err.message : "Update failed";
        return reply.status(400).send({
          success: false,
          error: { code: "UPDATE_FAILED", message },
        });
      }
    }
  );

  /**
   * Start export
   */
  fastify.post<{ Params: { id: string } }>(
    "/sessions/:id/export",
    async (request, reply) => {
      const user = request.user;
      if (!user) {
        return reply.status(401).send({
          success: false,
          error: { code: "UNAUTHORIZED", message: "Authentication required" },
        });
      }

      try {
        const body = startExportSchema.parse(request.body);
        const job = await directorService.startExport(
          request.params.id,
          user.id,
          body
        );
        return reply.status(202).send({
          success: true,
          data: job,
        });
      } catch (err) {
        if (err instanceof z.ZodError) {
          return reply.status(400).send({
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: err.errors[0]?.message,
            },
          });
        }
        const message = err instanceof Error ? err.message : "Export failed";
        return reply.status(400).send({
          success: false,
          error: { code: "EXPORT_FAILED", message },
        });
      }
    }
  );

  /**
   * Get export status
   */
  fastify.get<{ Params: { id: string } }>(
    "/sessions/:id/export",
    async (request, reply) => {
      const user = request.user;
      if (!user) {
        return reply.status(401).send({
          success: false,
          error: { code: "UNAUTHORIZED", message: "Authentication required" },
        });
      }

      try {
        const result = await directorService.getExportResult(
          request.params.id,
          user.id
        );
        return reply.send({
          success: true,
          data: result,
        });
      } catch (err) {
        return reply.status(404).send({
          success: false,
          error: { code: "NOT_FOUND", message: "Export not found" },
        });
      }
    }
  );
};
