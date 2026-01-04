import { Queue, Worker, Job as BullJob } from "bullmq";
import IORedis from "ioredis";
import { prisma } from "./prisma";
import { logger } from "./logger";
import { JobType, JobStatus } from "@prisma/client";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

// Shared Redis connection
const connection = new IORedis(REDIS_URL, {
  maxRetriesPerRequest: null,
});

export const storyQueue = new Queue("story-generation", { connection });

type JobData = {
  jobId: string; // Postgres ID
  userId: string;
  projectId?: string;
  type: JobType;
  input: any;
};

// Map BullMQ events to Prisma updates
async function updateJobStatus(
  jobId: string,
  status: JobStatus,
  output?: any,
  error?: string
) {
  try {
    await prisma.job.update({
      where: { id: jobId },
      data: {
        status,
        output: output || undefined,
        error: error || undefined,
        progress: status === "COMPLETED" ? 100 : undefined,
        completedAt:
          status === "COMPLETED" || status === "FAILED"
            ? new Date()
            : undefined,
      },
    });
  } catch (err) {
    logger.error({ jobId, err }, "Failed to sync job status to DB");
  }
}

// ---- MOCK AI SERVICE ----
async function mockStoryGeneration(input: any) {
  logger.info({ input }, "MOCK AI: Generating Story...");
  await new Promise((resolve) => setTimeout(resolve, 3000)); // Simulate 3s latency

  return {
    structure: {
      title: "The Neon Horizon",
      premise: input.prompt || "A futuristic journey.",
      scenes: [
        {
          id: crypto.randomUUID(),
          type: "intro",
          title: "The Awakening",
          description:
            "Cyberpunk city waking up at dawn. Neon lights flickering.",
          durationMs: 5000,
        },
        {
          id: crypto.randomUUID(),
          type: "content",
          title: "The Chase",
          description: "High speed hover-car chase through the rainy streets.",
          durationMs: 10000,
        },
        {
          id: crypto.randomUUID(),
          type: "outro",
          title: "Escape",
          description: "The protagonist looking at the sunset from a rooftop.",
          durationMs: 5000,
        },
      ],
    },
  };
}
// -------------------------

// Worker Processor
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const worker = new Worker<JobData>(
  "story-generation",
  async (job: BullJob<JobData>) => {
    logger.info({ jobId: job.data.jobId }, "Processing job");

    // 1. Sync status to PROCESSING
    await updateJobStatus(job.data.jobId, "PROCESSING");

    // 2. Select Processor based on Type
    try {
      let result;
      switch (job.data.type) {
        case "STORY_GENERATION":
          result = await mockStoryGeneration(job.data.input);
          break;
        case "SCENE_GENERATION":
          result = await processSceneGeneration(job.data.input);
          break;
        default:
          throw new Error(`Unknown job type: ${job.data.type}`);
      }

      // 3. Sync Status to COMPLETED
      await updateJobStatus(job.data.jobId, "COMPLETED", result);
      return result;
    } catch (error: any) {
      logger.error({ jobId: job.data.jobId, error }, "Job execution failed");
      await updateJobStatus(job.data.jobId, "FAILED", undefined, error.message);
      throw error;
    }
  },
  { connection }
);

async function processSceneGeneration(_input: any) {
  // TODO: Call Image/Video Gen models
  await new Promise((resolve) => setTimeout(resolve, 3000));
  return { assetUrl: "https://placeholder.co/video.mp4" };
}

// Public API to Enqueue Jobs
export async function enqueueJob(
  userId: string,
  type: JobType,
  input: any,
  projectId?: string
) {
  // 1. Create DB Record (Source of Truth)
  const jobRecord = await prisma.job.create({
    data: {
      userId,
      projectId,
      type,
      status: "PENDING",
      input,
    },
  });

  // 2. Add to Queue
  await storyQueue.add(type, {
    jobId: jobRecord.id,
    userId,
    projectId,
    type,
    input,
  });

  return jobRecord;
}
