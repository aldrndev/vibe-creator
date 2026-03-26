import type { JobStatus, JobType, Prisma } from '@prisma/client';
import { type Job as BullJob, Queue, Worker } from 'bullmq';
import { logger } from './logger';
import { prisma } from './prisma';

// Use shared options from redis lib
import { redisOptions } from './redis';

export const storyQueue = new Queue('story-generation', {
  connection: redisOptions,
});

type JobData = {
  jobId: string; // Postgres ID
  userId: string;
  projectId?: string;
  type: JobType;
  input: Record<string, unknown>;
};

// Map BullMQ events to Prisma updates
async function updateJobStatus(
  jobId: string,
  status: JobStatus,
  output?: Record<string, unknown>,
  error?: string,
) {
  try {
    await prisma.job.update({
      where: { id: jobId },
      data: {
        status,
        output: output as Prisma.InputJsonValue | undefined,
        error: error || undefined,
        progress: status === 'COMPLETED' ? 100 : undefined,
        completedAt: status === 'COMPLETED' || status === 'FAILED' ? new Date() : undefined,
      },
    });
  } catch (_err) {
    logger.error({ jobId, _err }, 'Failed to sync job status to DB');
  }
}

// ---- MOCK AI SERVICE ----
async function mockStoryGeneration(input: Record<string, unknown>) {
  logger.info({ input }, 'MOCK AI: Generating Story...');
  await new Promise((resolve) => setTimeout(resolve, 3000)); // Simulate 3s latency

  const prompt = typeof input.prompt === 'string' ? input.prompt : 'A futuristic journey.';

  return {
    structure: {
      title: 'The Neon Horizon',
      premise: prompt,
      scenes: [
        {
          id: crypto.randomUUID(),
          type: 'intro',
          title: 'The Awakening',
          description: 'Cyberpunk city waking up at dawn. Neon lights flickering.',
          durationMs: 5000,
        },
        {
          id: crypto.randomUUID(),
          type: 'content',
          title: 'The Chase',
          description: 'High speed hover-car chase through the rainy streets.',
          durationMs: 10000,
        },
        {
          id: crypto.randomUUID(),
          type: 'outro',
          title: 'Escape',
          description: 'The protagonist looking at the sunset from a rooftop.',
          durationMs: 5000,
        },
      ],
    },
  };
}
// -------------------------

// Worker Processor

export const worker = new Worker<JobData>(
  'story-generation',
  async (job: BullJob<JobData>) => {
    logger.info({ jobId: job.data.jobId }, 'Processing job');

    // 1. Sync status to PROCESSING
    await updateJobStatus(job.data.jobId, 'PROCESSING');

    // 2. Select Processor based on Type
    try {
      let result: Record<string, unknown>;
      switch (job.data.type) {
        case 'STORY_GENERATION':
          result = await mockStoryGeneration(job.data.input);
          break;
        case 'SCENE_GENERATION':
          result = await processSceneGeneration(job.data.input);
          break;
        default:
          throw new Error(`Unknown job type: ${job.data.type}`);
      }

      // 3. Sync Status to COMPLETED
      await updateJobStatus(job.data.jobId, 'COMPLETED', result);
      return result;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      logger.error({ jobId: job.data.jobId, err }, 'Job execution failed');
      await updateJobStatus(job.data.jobId, 'FAILED', undefined, errorMessage);
      throw err;
    }
  },
  { connection: redisOptions },
);

async function processSceneGeneration(_input: Record<string, unknown>) {
  // TODO: Call Image/Video Gen models
  await new Promise((resolve) => setTimeout(resolve, 3000));
  return { assetUrl: 'https://placeholder.co/video.mp4' };
}

// Public API to Enqueue Jobs
export async function enqueueJob(
  userId: string,
  type: JobType,
  input: Record<string, unknown>,
  projectId?: string,
) {
  // 1. Create DB Record (Source of Truth)
  const jobRecord = await prisma.job.create({
    data: {
      userId,
      projectId,
      type,
      status: 'PENDING',
      input: input as Prisma.InputJsonValue,
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
