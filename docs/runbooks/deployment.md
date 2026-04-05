# Deployment Runbook

## Prerequisites

- Docker & Docker Compose installed
- Node.js 20+ & pnpm 10+ installed
- SSH access to VPS

## Runtime Dependencies in Docker

Container API production dan development sudah membawa dependency media processing utama di image:

- `python3`
- `ffmpeg`
- `yt-dlp`
- `faster-whisper`

Artinya deployment Docker tidak membutuhkan install dependency tersebut di host VPS untuk runtime aplikasi.

## Quick Deploy (VPS Single-Node)

### 1. Clone & Setup

```bash
# SSH ke VPS
ssh user@your-vps-ip

# Clone repo
git clone https://github.com/aldrndev/vibe-creator.git
cd vibe-creator

# Install dependencies
pnpm install
```

### 2. Configure Environment

```bash
# Copy dan edit env untuk Docker infra
cp infra/compose/.env.docker.infra.example infra/compose/.env.docker.infra
nano infra/compose/.env.docker.infra

# Copy dan edit env untuk API
cp infra/compose/apps/api/.env.docker.example infra/compose/apps/api/.env.docker
nano infra/compose/apps/api/.env.docker
```

**Required Variables di `.env.docker.infra`:**
| Variable | Keterangan |
|----------|------------|
| `POSTGRES_PASSWORD` | Password kuat 32+ char |

**Required Variables di `apps/api/.env.docker`:**
| Variable | Keterangan |
|----------|------------|
| `DATABASE_URL` | Sesuaikan password dengan .env.docker.infra |
| `JWT_SECRET` | 64 char random |
| `JWT_REFRESH_SECRET` | 64 char random |
| `JWT_SIGNING_KEY` | ES256 JWK private key |
| `CORS_ORIGIN` | Domain production |
| `NODE_ENV` | `production` |

### 3. Build & Start Containers

```bash
# Build dan start production stack
pnpm docker:prod:up:build

# Cek status
pnpm docker:prod:ps
```

### 4. Setup Database

```bash
# Migration akan dijalankan oleh aplikasi/container yang terbaru.
# Jika perlu cek manual dari host:
pnpm --filter @vibe-creator/api exec prisma generate
```

### 5. Verify

```bash
curl http://localhost:3000/health
pnpm docker:prod:logs
```

## Script Reference

| Command                    | Fungsi                          |
| -------------------------- | ------------------------------- |
| `pnpm docker:prod:up`      | Start prod containers           |
| `pnpm docker:prod:up:build`| Build lalu start prod containers |
| `pnpm docker:prod:down`    | Stop prod containers            |
| `pnpm docker:prod:logs`    | Lihat logs                      |
| `pnpm docker:prod:restart` | Restart                         |

## Update Application

```bash
git pull origin main
pnpm install
pnpm docker:prod:up:build
```

## Rollback

```bash
git checkout <previous-tag>
pnpm install
pnpm docker:prod:up:build
```

## Health Checks

| Service    | Command                                              |
| ---------- | ---------------------------------------------------- |
| API        | `curl http://localhost:3000/health`                  |
| PostgreSQL | `docker exec vibe-creator-db-prod pg_isready`        |
| Redis      | `docker exec vibe-creator-redis-prod redis-cli ping` |

## Security Checklist

- [ ] `.env` files permissions: `chmod 600`
- [ ] Firewall: only 80, 443, SSH open
- [ ] Strong passwords (32+ chars)
- [ ] HTTPS via nginx/caddy
- [ ] Image production terbaru sudah dibuild ulang setelah perubahan API/media pipeline
