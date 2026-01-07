/**
 * Director Routes - Aggregator
 */
import { FastifyPluginAsync } from "fastify";
import { sessionRoutes } from "./routes/session.routes";
import { assetRoutes } from "./routes/asset.routes";
import { analysisRoutes } from "./routes/analysis.routes";
import { transcribeRoutes } from "./routes/transcribe.routes";
import { exportRoutes } from "./routes/export.routes";

export const directorRoutes: FastifyPluginAsync = async (fastify) => {
  // Register modular routes
  await fastify.register(sessionRoutes);
  await fastify.register(assetRoutes);
  await fastify.register(analysisRoutes);
  await fastify.register(transcribeRoutes);
  await fastify.register(exportRoutes);
};
