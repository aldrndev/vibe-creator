# ============================================
# Vibe Creator - API Dockerfile
# Includes FFmpeg and yt-dlp for video processing
# ============================================

# 1. Base Stage (Common Setup)
FROM node:20-slim AS base
WORKDIR /app
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ARG DATABASE_URL=postgresql://postgres:postgres@localhost:5432/vibe_creator?schema=public
ENV DATABASE_URL="${DATABASE_URL}"
# Install system dependencies, corepack, and Python packages
RUN corepack enable \
    && apt-get update && apt-get install -y \
    ffmpeg \
    python3 \
    python3-pip \
    python3-venv \
    rsync \
    wget \
    openssl \
    ca-certificates \
    fontconfig \
    fonts-bebas-neue \
    fonts-cherrybomb \
    fonts-comfortaa \
    fonts-inter \
    fonts-lato \
    fonts-league-spartan \
    fonts-liberation \
    fonts-manrope \
    fonts-open-sans \
    && rm -rf /var/lib/apt/lists/* \
    && fc-cache -f \
    && pip3 install --no-cache-dir --break-system-packages yt-dlp faster-whisper opencv-python-headless

# 2. Development Stage (Hot Reload)
FROM base AS development
WORKDIR /app

# Copy package files
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages ./packages
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY apps/api/prisma ./apps/api/prisma
COPY apps/api/prisma.config.ts ./apps/api/prisma.config.ts

# Install ALL dependencies (including dev)
RUN pnpm install --frozen-lockfile

# Generate Prisma Client
WORKDIR /app/apps/api
RUN pnpm prisma generate

# Go back to root for dev command context
WORKDIR /app

# Environment
ENV NODE_ENV=development
ENV PORT=3000

EXPOSE 3000
CMD ["pnpm", "--filter", "@vibe-creator/api", "dev"]


# 3. Builder Stage (Compiling for Prod)
FROM base AS builder
WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages ./packages
COPY apps/web/package.json ./apps/web/
COPY apps/api ./apps/api

# Install full dependencies for build
RUN pnpm install --frozen-lockfile

# Build shared
WORKDIR /app/packages/shared
RUN pnpm build
# Patch package.json for dist usage
RUN sed -i 's|./src/index.ts|./dist/index.js|g' package.json

# Build API
WORKDIR /app/apps/api
RUN pnpm prisma generate
RUN pnpm build


# 4. Production Runner Stage
FROM base AS runner
WORKDIR /app

# Copy package files again for clean install
COPY --from=builder /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/api/package.json ./apps/api/
COPY --from=builder /app/apps/web/package.json ./apps/web/

# Install PROD dependencies only
RUN pnpm install --prod --frozen-lockfile --ignore-scripts

# Copy built artifacts
WORKDIR /app/apps/api
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/prisma ./prisma
COPY --from=builder /app/apps/api/prisma.config.ts ./prisma.config.ts

# Generate Prisma Engine locally for production
WORKDIR /app/apps/api
RUN pnpm dlx prisma generate

# Copy Python Scripts for Runtime
COPY --from=builder /app/apps/api/src/modules/transcribe/run_whisper.py ./dist/modules/transcribe/
COPY --from=builder /app/apps/api/src/modules/director/processing/run_face_tracking.py ./dist/modules/director/processing/
COPY --from=builder /app/apps/api/src/modules/director/processing/face_tracking_core.py ./dist/modules/director/processing/


# Create upload directories & permissions
RUN mkdir -p /app/uploads/temp \
             /app/uploads/exports \
             /app/uploads/downloads \
             /app/uploads/loops \
             /app/uploads/projects \
             /app/uploads/cache/huggingface \
             /app/uploads/director \
             /app/uploads/director/previews \
             /app/uploads/director/clip-previews \
             /app/uploads/director/live-previews \
             /app/uploads/director/exports \
             /app/uploads/temp/workspace-thumbnails \
             /app/uploads/temp/loop-previews \
             /app/uploads/temp/director/audio-proxies \
    && chown -R node:node /app /app/uploads

USER node

ENV NODE_ENV=production
ENV PORT=3000
ENV HF_HOME=/app/uploads/cache/huggingface

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "dist/index.js"]
