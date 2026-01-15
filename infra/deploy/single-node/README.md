# VPS Single-Node Deployment (Full Containerized)

Deploy Vibe Creator ke VPS dengan **semua service dalam Docker containers**.

## Prerequisites

- Ubuntu 22.04+ / Debian 12+
- Docker & Docker Compose v2
- Git

**Tidak perlu install Node.js di host** - semua dalam container!

## Quick Start

### 1. Clone Repository

```bash
git clone https://github.com/aldrndev/vibe-creator.git
cd vibe-creator
```

### 2. Setup Environment Files

```bash
# Infrastructure (PostgreSQL password)
cp infra/compose/.env.docker.infra.example infra/compose/.env.docker.infra
nano infra/compose/.env.docker.infra

# API (JWT secrets, API keys)
cp infra/compose/apps/api/.env.docker.example infra/compose/apps/api/.env.docker
nano infra/compose/apps/api/.env.docker
```

### 3. Deploy

```bash
chmod +x infra/deploy/single-node/deploy.sh
./infra/deploy/single-node/deploy.sh --first-run
```

Ini akan:

- Build API Docker image
- Start PostgreSQL, Redis, dan API containers
- Run database migrations

### 4. Setup Nginx + SSL

```bash
sudo cp infra/deploy/single-node/nginx.conf /etc/nginx/sites-available/vibe-creator
sudo nano /etc/nginx/sites-available/vibe-creator  # ganti domain
sudo ln -s /etc/nginx/sites-available/vibe-creator /etc/nginx/sites-enabled/
sudo certbot --nginx -d yourdomain.com
sudo systemctl restart nginx
```

## Commands

| Command                     | Fungsi             |
| --------------------------- | ------------------ |
| `pnpm docker:prod:ps`       | Status containers  |
| `pnpm docker:prod:logs`     | View logs          |
| `pnpm docker:prod:restart`  | Restart containers |
| `pnpm docker:prod:build`    | Rebuild image only |
| `pnpm docker:prod:up:build` | Rebuild & start    |

## Update Application

```bash
cd ~/vibe-creator
./infra/deploy/single-node/deploy.sh
```

## Included in Container

- ✅ Node.js 20
- ✅ FFmpeg
- ✅ Python + yt-dlp
- ✅ faster-whisper (auto-transcription)

## Troubleshooting

### View Logs

```bash
pnpm docker:prod:logs
docker logs vibe-creator-api-prod
```

### Restart

```bash
pnpm docker:prod:restart
```

### Rebuild from scratch

```bash
pnpm docker:prod:down
docker system prune -af
pnpm docker:prod:up:build
```
