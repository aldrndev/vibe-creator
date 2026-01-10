# Deployment Runbook

## Prerequisites

- Docker & Docker Compose installed
- Node.js 20+ & pnpm 10+ installed
- SSH access to VPS

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

### 3. Start Infrastructure

```bash
# Start PostgreSQL + Redis
pnpm docker:prod:up

# Cek status
pnpm docker:prod:ps
```

### 4. Setup Database

```bash
# Generate Prisma client
pnpm db:generate

# Push schema ke database
cd apps/api && npx prisma db push
cd ..
```

### 5. Build & Start

```bash
# Build
pnpm build

# Start dengan PM2 (recommended)
cd apps/api && pm2 start dist/index.js --name vibe-api
```

### 6. Verify

```bash
curl http://localhost:3000/health
```

## Script Reference

| Command                    | Fungsi                |
| -------------------------- | --------------------- |
| `pnpm docker:prod:up`      | Start prod containers |
| `pnpm docker:prod:down`    | Stop prod containers  |
| `pnpm docker:prod:logs`    | Lihat logs            |
| `pnpm docker:prod:restart` | Restart               |

## Update Application

```bash
git pull origin main
pnpm install
pnpm build
cd apps/api && npx prisma db push && cd ..
pm2 restart vibe-api
```

## Rollback

```bash
git checkout <previous-tag>
pnpm install && pnpm build
pm2 restart vibe-api
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
