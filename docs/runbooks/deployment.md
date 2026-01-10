# Deployment Runbook

## Prerequisites

- Docker & Docker Compose installed
- Access to production server (SSH)
- Environment variables configured
- Database credentials ready

## Quick Deploy (Docker)

### 1. Clone & Setup

```bash
git clone <repo-url>
cd contencreative
```

### 2. Configure Environment

```bash
# Copy example files
cp infra/compose/.env.docker.infra.example infra/compose/.env.docker.infra
cp infra/compose/apps/api/.env.docker.example infra/compose/apps/api/.env.docker

# Edit with production values
nano infra/compose/.env.docker.infra
nano infra/compose/apps/api/.env.docker
```

**Required Environment Variables:**

- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `JWT_SECRET` - Min 32 chars, cryptographically random
- `JWT_SIGNING_KEY` - ES256 JWK private key
- `XENDIT_SECRET_KEY` - Production Xendit key
- `R2_*` - Cloudflare R2 credentials

### 3. Build & Deploy

```bash
# Production single-node deployment
docker compose -f infra/compose/docker-compose.prod.single-node.yml up -d --build

# Check status
docker ps
docker logs vibe-creator-server
```

### 4. Run Migrations

```bash
docker exec -it vibe-creator-server pnpm prisma migrate deploy
```

### 5. Verify Health

```bash
curl http://localhost:3000/health
# Expected: {"status":"ok"}
```

## Rollback Procedure

### Quick Rollback

```bash
# Stop current version
docker compose -f infra/compose/docker-compose.prod.single-node.yml down

# Deploy previous version
git checkout <previous-tag>
docker compose -f infra/compose/docker-compose.prod.single-node.yml up -d --build
```

### Database Rollback

```bash
# Check migration history
docker exec -it vibe-creator-server pnpm prisma migrate status

# Rollback last migration (manual)
docker exec -it vibe-creator-db psql -U postgres -d vibe_creator
```

## Maintenance Tasks

### Update Application

```bash
git pull origin main
docker compose -f infra/compose/docker-compose.prod.single-node.yml up -d --build
docker exec -it vibe-creator-server pnpm prisma migrate deploy
```

### View Logs

```bash
# All services
docker compose -f infra/compose/docker-compose.prod.single-node.yml logs -f

# API only
docker logs -f vibe-creator-server

# Last 100 lines
docker logs --tail 100 vibe-creator-server
```

### Restart Services

```bash
# Single service
docker restart vibe-creator-server

# All services
docker compose -f infra/compose/docker-compose.prod.single-node.yml restart
```

## Health Checks

| Endpoint             | Expected                |
| -------------------- | ----------------------- |
| `GET /health`        | `{"status":"ok"}`       |
| `GET /api/v1/health` | `{"status":"ok"}`       |
| PostgreSQL           | `pg_isready` success    |
| Redis                | `redis-cli ping` → PONG |

## Troubleshooting

### API Not Starting

1. Check logs: `docker logs vibe-creator-server`
2. Verify env vars are set
3. Check database connectivity
4. Ensure migrations are applied

### Database Connection Failed

1. Check `DATABASE_URL` format
2. Verify PostgreSQL is running
3. Check network connectivity between containers

### Redis Connection Failed

1. Verify Redis container is healthy
2. Check `REDIS_URL` configuration
3. Ensure Redis port is not blocked
