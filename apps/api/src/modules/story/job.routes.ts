import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { JobType } from "@prisma/client";
import { enqueueJob } from "../../lib/queue";
import { prisma } from "../../lib/prisma";
import { requireAuth } from "@/plugins/auth";

// Define schemas outside
const generateStructureSchema = z.object({
  projectId: z.string().optional(),
  prompt: z.string().min(10),
  vibe: z
    .object({
      mood: z.string().optional(),
      style: z.string().optional(),
      tempo: z.enum(["slow", "medium", "fast"]).optional(),
    })
    .optional(),
});

export async function jobRoutes(app: FastifyInstance) {
  // 1. Generate Story Structure
  app.post(
    "/story/generate-structure",
    {
      preHandler: [requireAuth],
    },
    async (req, reply) => {
      // Manual Zod parsing
       
      const body = generateStructureSchema.parse(req.body);
      const { prompt, vibe, projectId } = body;
      const userId = req.user!.id;

      // TODO: Check Quotas here

      const job = await enqueueJob(
        userId,
        JobType.STORY_GENERATION,
        { prompt, vibe },
        projectId
      );

      return reply.status(201).send({
        success: true,
        data: {
          jobId: job.id,
          status: job.status,
        },
      });
    }
  );

  // 2. Poll Job Status
  app.get(
    "/:id",
    {
      preHandler: [requireAuth],
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const userId = req.user!.id;

      const job = await prisma.job.findUnique({
        where: { id },
      });

      if (!job) {
        return reply
          .status(404)
          .send({ success: false, error: "Job not found" });
      }

      // Security: Maintain ownership
      if (job.userId !== userId) {
        return reply
          .status(403)
          .send({ success: false, error: "Unauthorized" });
      }

      return {
        success: true,
        data: job,
      };
    }
  );
}
