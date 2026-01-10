import { logger } from "@/lib/logger";
import { directorWorker } from "@/modules/director/director.worker";

/**
 * Start all background workers
 */
export async function startWorkers() {
  logger.info("Starting background workers...");

  // Director Analysis Worker
  directorWorker.on("ready", () => {
    logger.info("🎬 Director Worker ready");
  });

  directorWorker.on("error", (err) => {
    logger.error({ err }, "🎬 Director Worker error");
  });

  // Keep workers alive
  // (BullMQ workers start automatically upon instantiation,
  // but we import them here to ensure they are loaded)

  return {
    directorWorker,
  };
}
