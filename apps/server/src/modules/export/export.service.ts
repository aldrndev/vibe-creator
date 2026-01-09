import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { ExportResolution } from "@prisma/client";
import { cancelExportJob } from "./export-cancel";
import { processExportJob } from "./processors/export.processor";

interface TimelineData {
  clips: Array<{
    localPath: string;
    startTime: number;
    endTime: number;
    transforms?: {
      x: number;
      y: number;
      scale: number;
      rotation: number;
      opacity: number;
    };
    effects?: {
      filters: string[];
      speed: number;
      volume: number;
      fadeIn: number;
      fadeOut: number;
    };
  }>;
  textOverlays?: Array<{
    id: string;
    content: string;
    startMs: number;
    endMs: number;
    x: number;
    y: number;
    fontSize: number;
    fontFamily: string;
    color: string;
    backgroundColor?: string;
  }>;
  audioTracks?: Array<{
    localPath: string;
    startTime: number;
    endTime: number;
    volume: number;
  }>;
  settings: {
    width: number;
    height: number;
    fps: number;
  };
}

interface CreateExportJobInput {
  userId: string;
  projectId?: string | null;
  timelineData: TimelineData;
  format?: "MP4" | "WEBM" | "MOV";
  resolution?: "SD" | "HD" | "UHD";
  addWatermark?: boolean;
}

/**
 * Export service for handling video export jobs
 * NOW REFACTORED: Delegates processing to export.processor.ts
 */
export const exportService = {
  async createJob(input: CreateExportJobInput) {
    const {
      userId,
      projectId,
      timelineData,
      format = "MP4",
      resolution = "HD",
      addWatermark = true,
    } = input;

    // Check rate limit (max 3 pending jobs per user)
    const pendingJobs = await prisma.exportHistory.count({
      where: {
        userId,
        status: {
          in: ["QUEUED", "PROCESSING"],
        },
      },
    });

    if (pendingJobs >= 3) {
      throw new Error(
        "Too many pending export jobs. Please wait for current exports to complete."
      );
    }

    const job = await prisma.exportHistory.create({
      data: {
        userId,
        projectId: projectId && projectId !== "default" ? projectId : undefined,
        format,
        resolution: resolution as ExportResolution,
        status: "QUEUED",
        timelineData: JSON.parse(JSON.stringify(timelineData)),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    // Start processing in background
    this.processJob(job.id, addWatermark).catch((err) => {
      logger.error({ err, jobId: job.id }, "Export job failed");
    });

    return job;
  },

  async getJobStatus(jobId: string, userId: string) {
    const job = await prisma.exportHistory.findFirst({
      where: {
        id: jobId,
        userId,
      },
    });

    if (!job) {
      throw new Error("Export job not found");
    }

    return {
      id: job.id,
      status: job.status,
      progress: job.progress,
      errorMessage: job.errorMessage,
      localPath: job.localPath,
      downloadUrl: job.downloadUrl,
      urlExpiresAt: job.urlExpiresAt,
      completedAt: job.completedAt,
    };
  },

  async processJob(jobId: string, addWatermark: boolean) {
    return processExportJob(jobId, addWatermark);
  },

  async cancelJob(jobId: string, userId: string) {
    const result = await cancelExportJob(jobId, userId);

    if (!result.success && result.status === "NOT_FOUND") {
      throw new Error("Export job not found");
    }

    if (!result.success && result.status === "ALREADY_COMPLETED") {
      throw new Error("Cannot cancel completed job");
    }

    return {
      success: result.success,
      previousStatus: result.status,
      message: result.message,
    };
  },

  async getHistory(userId: string, limit = 10) {
    return prisma.exportHistory.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  },
};
