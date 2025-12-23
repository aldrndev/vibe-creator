# ============================================
# Vibe Creator - Server Dockerfile
# Includes FFmpeg and yt-dlp for video processing
# ============================================

# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy workspace files
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages ./packages
COPY apps/server ./apps/server

# Install dependencies
RUN pnpm install --frozen-lockfile

# Generate Prisma client
WORKDIR /app/apps/server
RUN pnpm prisma generate

# Build server
RUN pnpm build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

# Install FFmpeg, yt-dlp, and Python (required by yt-dlp)
RUN apk add --no-cache \
    ffmpeg \
    python3 \
    py3-pip \
    && pip3 install --no-cache-dir yt-dlp

# Install pnpm
RUN npm install -g pnpm

# Copy built app
COPY --from=builder /app/apps/server/dist ./dist
COPY --from=builder /app/apps/server/package.json ./
COPY --from=builder /app/apps/server/prisma ./prisma
COPY --from=builder /app/node_modules/.pnpm/@prisma+client* /app/node_modules/.pnpm/
COPY --from=builder /app/node_modules/@prisma /app/node_modules/@prisma

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile

# Create upload directories
RUN mkdir -p uploads/temp uploads/exports uploads/downloads

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Run as non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 fastify && \
    chown -R fastify:nodejs /app

USER fastify

CMD ["node", "dist/index.js"]
