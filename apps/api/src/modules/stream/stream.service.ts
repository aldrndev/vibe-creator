/**
 * Stream Service
 * RTMP live streaming service - main facade
 */

import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { billingService } from "../billing/billing.service";
import {
  StreamConfig,
  getRtmpUrl,
  buildStreamArgs,
} from "./services/rtmp.utils";
import {
  hasActiveStream,
  killUserStream,
  startStreamProcess,
  stopStreamProcess,
  scheduleStreamLive,
  isStreamActive,
} from "./services/process.manager";
import { startStreamReaper, setStopStreamHandler } from "./services/reaper";

export type { StreamConfig, StreamPlatform } from "./services/rtmp.utils";

interface StartStreamInput {
  userId: string;
  inputPath: string;
  config: StreamConfig;
}

const ABSOLUTE_MAX_DURATION = 1440; // 24 hours

export const streamService = {
  /**
   * Start streaming video to RTMP server
   */
  async startStream(input: StartStreamInput): Promise<{ streamId: string }> {
    const { userId, inputPath, config } = input;

    // 1. Concurrency Control: Enforce 1 stream per user
    if (hasActiveStream(userId)) {
      logger.info({ userId }, "Stopping existing stream for new session");
      await killUserStream(userId);
    }

    // 2. Quota Check
    const cycle = await billingService.getOrCreateOpenCycle(userId);
    const quotaTotal = cycle.quotaMinutesBase + cycle.quotaMinutesTopup;
    const quotaRemaining = Math.max(0, quotaTotal - cycle.quotaMinutesUsed);

    if (quotaRemaining <= 0) {
      throw new Error("Streaming quota exhausted. Please upgrade or top-up.");
    }

    // 3. Calculate duration and auto-stop time
    const requestedDuration = config.durationMinutes || 60;
    const effectiveDuration = Math.min(requestedDuration, quotaRemaining);
    const finalDuration = Math.min(effectiveDuration, ABSOLUTE_MAX_DURATION);
    const autoStopAt = new Date(Date.now() + finalDuration * 60 * 1000);

    // 4. Create stream record
    const stream = await prisma.streamSession.create({
      data: {
        userId,
        platform: config.platform,
        status: "STARTING",
        startedAt: new Date(),
        autoStopAt,
        quotaCycleId: cycle.id,
        config: {
          quality: config.quality,
          bitrateKbps: config.bitrateKbps,
          platform: config.platform,
        },
      },
    });

    // 5. Build RTMP URL and FFmpeg args
    const rtmpUrl = getRtmpUrl(
      config.platform,
      config.streamKey,
      config.rtmpUrl
    );
    const args = buildStreamArgs(inputPath, config, rtmpUrl);

    // 6. Start process
    startStreamProcess(stream.id, userId, args);
    scheduleStreamLive(stream.id);

    logger.info({ streamId: stream.id, autoStopAt }, "Stream started");

    return { streamId: stream.id };
  },

  /**
   * Stop an active stream
   */
  async stopStream(
    streamId: string,
    userId: string,
    reason: "USER_REQUEST" | "AUTO_STOP" | "ADMIN" | "ERROR" = "USER_REQUEST"
  ): Promise<void> {
    const stream = await prisma.streamSession.findFirst({
      where: { id: streamId, userId },
    });

    if (!stream) throw new Error("Stream not found");

    // Kill process
    stopStreamProcess(streamId, userId);

    // Idempotent billing update via transaction
    await prisma.$transaction(
      async (tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]) => {
        const now = new Date();
        const existing = await tx.streamSession.findUnique({
          where: { id: streamId },
        });
        if (!existing || existing.durationMinutesBilled !== null) return;

        // Calculate minutes
        const start = existing.startedAt.getTime();
        const end = now.getTime();
        const seconds = Math.max(0, (end - start) / 1000);
        const minutesBilled = Math.ceil(seconds / 60);

        // Update session
        await tx.streamSession.update({
          where: { id: streamId },
          data: {
            status: "ENDED",
            endedAt: now,
            durationMinutesBilled: minutesBilled,
            stopReason: reason,
          },
        });

        // Update quota cycle
        if (existing.quotaCycleId) {
          await tx.streamQuotaCycle.update({
            where: { id: existing.quotaCycleId },
            data: { quotaMinutesUsed: { increment: minutesBilled } },
          });
        }
      }
    );

    logger.info({ streamId, reason }, "Stream stopped and billed");
  },

  /**
   * Get stream status
   */
  async getStreamStatus(streamId: string, userId: string) {
    const stream = await prisma.streamSession.findFirst({
      where: { id: streamId, userId },
    });

    if (!stream) throw new Error("Stream not found");

    return { ...stream, isActive: isStreamActive(streamId) };
  },

  /**
   * Get user's stream history
   */
  async getHistory(userId: string, limit = 20) {
    return prisma.streamSession.findMany({
      where: { userId },
      orderBy: { startedAt: "desc" },
      take: limit,
    });
  },

  /**
   * Get active streams for user
   */
  async getActiveStreams(userId: string) {
    return prisma.streamSession.findMany({
      where: { userId, status: { in: ["STARTING", "LIVE"] } },
    });
  },
};

// Register stop handler with reaper and start it
setStopStreamHandler(streamService.stopStream.bind(streamService));
startStreamReaper();
