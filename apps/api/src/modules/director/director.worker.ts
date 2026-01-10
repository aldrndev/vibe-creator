import { Worker, Job } from "bullmq";
import { redisOptions } from "@/lib/redis";
import { logger } from "@/lib/logger";
import {
  DIRECTOR_QUEUE_NAME,
  DirectorAnalysisJobData,
  DirectorJobData,
  DirectorTranscribeSessionJobData,
  DirectorTranscribeClipJobData,
  DirectorExportJobData,
} from "./director.queue";
import { processAnalysisJob } from "./handlers/analysis.handler";
import {
  processTranscribeSessionJob,
  processTranscribeClipJob,
} from "./handlers/transcribe.handler";
import { processExportJob } from "./handlers/export.handler";

/**
 * Main Job Dispatcher
 */
async function jobProcessor(job: Job<DirectorJobData>) {
  const jobType = job.data.type;
  switch (jobType) {
    case "ANALYSIS":
      return processAnalysisJob(job as Job<DirectorAnalysisJobData>);
    case "TRANSCRIBE_SESSION":
      return processTranscribeSessionJob(
        job as Job<DirectorTranscribeSessionJobData>
      );
    case "TRANSCRIBE_CLIP":
      return processTranscribeClipJob(
        job as Job<DirectorTranscribeClipJobData>
      );
    case "EXPORT":
      return processExportJob(job as Job<DirectorExportJobData>);
    default: {
      // Fallback for legacy jobs
      if (job.name === "analyze") {
        return processAnalysisJob(job as Job<DirectorAnalysisJobData>);
      }
      const _exhaustiveCheck: never = jobType;
      throw new Error(`Unknown job type: ${String(_exhaustiveCheck)}`);
    }
  }
}

/**
 * Director Worker Instance
 */
export const directorWorker = new Worker<DirectorJobData>(
  DIRECTOR_QUEUE_NAME,
  jobProcessor,
  {
    connection: redisOptions,
    concurrency: 5,
    limiter: {
      max: 10,
      duration: 1000,
    },
  }
);

directorWorker.on("completed", (job) => {
  logger.info(
    { jobId: job.id, type: job.data.type },
    "Job completed successfully"
  );
});

directorWorker.on("failed", (job, err) => {
  logger.error({ jobId: job?.id, type: job?.data.type, err }, "Job failed");
});
