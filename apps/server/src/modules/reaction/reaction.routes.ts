import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { reactionService } from "./reaction.service";
import { createReadStream, existsSync, statSync } from "fs";
import path from "path";
import { env } from "@/config/env";

const createReactionSchema = z.object({
  mainVideoPath: z.string(),
  reactionVideoPath: z.string(),
  position: z
    .enum(["top-left", "top-right", "bottom-left", "bottom-right"])
    .default("bottom-right"),
  scale: z.number().min(0.1).max(0.5).default(0.3),
  margin: z.number().min(0).max(100).default(20),
  aspectRatio: z.enum(["16:9", "9:16", "1:1", "4:5"]).default("16:9"),
});

const createSideBySideSchema = z.object({
  leftVideoPath: z.string(),
  rightVideoPath: z.string(),
  layout: z.enum(["horizontal", "vertical"]).default("horizontal"),
  aspectRatio: z.enum(["16:9", "9:16", "1:1", "4:5"]).default("16:9"),
  reactionVolume: z.number().min(0).max(2).default(0.8),
  mainVolume: z.number().min(0).max(2).default(1.0),
  splitRatio: z.number().min(0.5).max(0.7).default(0.5), // Main must be at least 50%, max 70%
  smoothBorder: z.boolean().default(false).optional(),
  overlayMode: z.boolean().default(false).optional(),
});

const createReactionMixedSchema = createReactionSchema.extend({
  reactionVolume: z.number().min(0).max(2).default(0.8),
  mainVolume: z.number().min(0).max(2).default(1.0),
  circular: z.boolean().default(false),
});

export const reactionRoutes: FastifyPluginAsync = async (fastify) => {
  // --- JANITOR: Auto Cleanup ---
  // Run every 30 minutes, delete files older than 1 hour.
  const cleanupInterval = setInterval(() => {
    reactionService.cleanupOldReactions(60 * 60 * 1000).catch((err) => {
      fastify.log.error({ err }, "Reaction Janitor Error");
    });
  }, 30 * 60 * 1000);

  fastify.addHook("onClose", (_instance, done) => {
    clearInterval(cleanupInterval);
    done();
  });
  /**
   * Create reaction video with PiP overlay
   */
  fastify.post("/create", async (request, reply) => {
    const user = request.user;
    if (!user) {
      return reply.status(401).send({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Authentication required" },
      });
    }

    try {
      const body = createReactionSchema.parse(request.body);
      const outputPath = await reactionService.createReaction(body);

      return reply.send({
        success: true,
        data: { outputPath },
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: { code: "VALIDATION_ERROR", message: err.errors[0]?.message },
        });
      }

      const message =
        err instanceof Error ? err.message : "Reaction creation failed";
      return reply.status(500).send({
        success: false,
        error: { code: "REACTION_ERROR", message },
      });
    }
  });

  /**
   * Create side-by-side video
   */
  fastify.post("/create-side-by-side", async (request, reply) => {
    const user = request.user;
    if (!user) {
      return reply.status(401).send({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Authentication required" },
      });
    }

    try {
      const body = createSideBySideSchema.parse(request.body);
      const outputPath = await reactionService.createSideBySide(body);

      return reply.send({
        success: true,
        data: { outputPath },
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: { code: "VALIDATION_ERROR", message: err.errors[0]?.message },
        });
      }

      const message =
        err instanceof Error ? err.message : "Side-by-side creation failed";
      return reply.status(500).send({
        success: false,
        error: { code: "SIDEBYSIDE_ERROR", message },
      });
    }
  });

  /**
   * Create reaction video with mixed audio
   */
  fastify.post("/create-mixed", async (request, reply) => {
    const user = request.user;
    if (!user) {
      return reply.status(401).send({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Authentication required" },
      });
    }

    try {
      const body = createReactionMixedSchema.parse(request.body);
      const outputPath = await reactionService.createReactionMixedAudio(body);

      return reply.send({
        success: true,
        data: { outputPath },
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: { code: "VALIDATION_ERROR", message: err.errors[0]?.message },
        });
      }

      const message =
        err instanceof Error ? err.message : "Reaction creation failed";
      return reply.status(500).send({
        success: false,
        error: { code: "REACTION_ERROR", message },
      });
    }
  });

  /**
   * Download generated file
   */
  fastify.get<{ Params: { filename: string } }>(
    "/download/:filename",
    async (request, reply) => {
      const user = request.user;
      if (!user) {
        return reply.status(401).send({
          success: false,
          error: { code: "UNAUTHORIZED", message: "Authentication required" },
        });
      }

      // Security: Sanitize filename to prevent path traversal
      const sanitizedFilename = path.basename(request.params.filename);

      // Security: Validate filename format (alphanumeric, dash, underscore, dot only)
      if (!/^[\w\-.]+$/.test(sanitizedFilename)) {
        return reply.status(400).send({
          success: false,
          error: {
            code: "INVALID_FILENAME",
            message: "Invalid filename format",
          },
        });
      }

      const uploadsDir = path.resolve(env.MEDIA_INPUT_DIR, "reactions");
      const filePath = path.join(uploadsDir, sanitizedFilename);

      // Security: Verify resolved path is within allowed directory
      if (!path.resolve(filePath).startsWith(uploadsDir)) {
        return reply.status(400).send({
          success: false,
          error: { code: "INVALID_PATH", message: "Invalid file path" },
        });
      }

      if (!existsSync(filePath)) {
        return reply.status(404).send({
          success: false,
          error: { code: "NOT_FOUND", message: "File not found" },
        });
      }

      const stat = statSync(filePath);
      const stream = createReadStream(filePath);

      return reply
        .header("Content-Type", "video/mp4")
        .header(
          "Content-Disposition",
          `attachment; filename="${sanitizedFilename}"`
        )
        .header("Content-Length", stat.size)
        .header("X-Content-Type-Options", "nosniff")
        .send(stream);
    }
  );
};
