import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { directorService } from "../director.service";

const startExportSchema = z.object({
  aspectRatio: z.enum(["9:16", "16:9", "1:1"]).optional(),
  quality: z.enum(["720p", "1080p"]).optional(),
  includeSubtitles: z.boolean().optional(),
});

export const exportRoutes: FastifyPluginAsync = async (fastify) => {
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
      } catch {
        return reply.status(404).send({
          success: false,
          error: { code: "NOT_FOUND", message: "Export not found" },
        });
      }
    }
  );
};
