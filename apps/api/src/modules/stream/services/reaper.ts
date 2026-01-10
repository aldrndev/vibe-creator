/**
 * Stream Reaper
 * Background job to auto-stop expired streams
 */

import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

// Stop reason type - matches stream.service.ts stopStream signature
type StopReason = "USER_REQUEST" | "AUTO_STOP" | "ADMIN" | "ERROR";

// Forward declaration - will be set by stream.service.ts
let stopStreamFn: (
  streamId: string,
  userId: string,
  reason: StopReason
) => Promise<void>;

/**
 * Set the stop stream function (called by stream.service.ts to avoid circular deps)
 */
export function setStopStreamHandler(
  handler: (
    streamId: string,
    userId: string,
    reason: StopReason
  ) => Promise<void>
) {
  stopStreamFn = handler;
}

/**
 * Start the stream reaper background job
 */
export function startStreamReaper(): void {
  setInterval(async () => {
    try {
      const now = new Date();

      // Find streams that should have stopped
      const expiredStreams = await prisma.streamSession.findMany({
        where: {
          status: { in: ["LIVE", "STARTING"] },
          autoStopAt: { lte: now },
        },
      });

      if (expiredStreams.length > 0) {
        logger.info(
          { count: expiredStreams.length },
          "Reaper found expired streams"
        );

        for (const s of expiredStreams) {
          logger.info({ streamId: s.id }, "Reaper auto-stopping stream");

          if (stopStreamFn) {
            await stopStreamFn(s.id, s.userId, "AUTO_STOP").catch((err) => {
              logger.error(
                { err, streamId: s.id },
                "Reaper failed to stop stream"
              );

              // Force DB update if process kill failed
              prisma.streamSession
                .update({
                  where: { id: s.id },
                  data: {
                    status: "ENDED",
                    endedAt: now,
                    stopReason: "AUTO_STOP",
                    durationMinutesBilled: 0,
                  },
                })
                .catch(() => {});
            });
          }
        }
      }
    } catch (e) {
      logger.error({ err: e }, "Reaper error");
    }
  }, 30000); // Check every 30s
}
