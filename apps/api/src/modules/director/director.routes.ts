/**
 * Director Routes - Aggregator
 */
import type { FastifyPluginAsync } from 'fastify';
import { analysisRoutes } from './routes/analysis.routes';
import { assetRoutes } from './routes/asset.routes';
import { exportRoutes } from './routes/export.routes';
import { sessionRoutes } from './routes/session.routes';
import { transcribeRoutes } from './routes/transcribe.routes';

export const directorRoutes: FastifyPluginAsync = async (fastify) => {
  // Register modular routes
  await fastify.register(sessionRoutes);
  await fastify.register(assetRoutes);
  await fastify.register(analysisRoutes);
  await fastify.register(transcribeRoutes);
  await fastify.register(exportRoutes);
};
