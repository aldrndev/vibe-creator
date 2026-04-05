# Development Setup Runbook

## Prerequisites

| Requirement | Version | Check Command      |
| ----------- | ------- | ------------------ |
| Node.js     | 20+     | `node --version`   |
| pnpm        | 10+     | `pnpm --version`   |
| Docker      | Latest  | `docker --version` |

## Dependency Modes

Ada dua mode development yang didukung, dan kebutuhan dependency lokalnya berbeda:

### Full Docker

Mode ini menjalankan API di dalam container Docker.

Dependency runtime untuk AI Director dan video processing sudah termasuk di image API:

- `python3`
- `ffmpeg`
- `yt-dlp`
- `faster-whisper`

Kalau Anda memakai mode ini, Mac lokal tidak perlu memasang dependency tersebut untuk runtime aplikasi.

### Hybrid: Docker Infra + App Lokal

Mode ini menjalankan PostgreSQL, Redis, dan Cobalt di Docker, tetapi `web` dan `api` tetap jalan dari source code lokal lewat `pnpm dev`.

Dependency lokal yang tetap diperlukan:

- `python3`
- `ffmpeg`
- `yt-dlp`

`faster-whisper` dan dependency Python lainnya tidak perlu dipasang secara global. Gunakan virtual environment project lewat:

```bash
pnpm api:python:setup
```

Command di atas akan membuat `apps/api/venv` dan menginstal dependency dari [requirements.txt](/Users/aldrnmrsd/Documents/Coding/contencreative/apps/api/requirements.txt) ke environment project, bukan ke Python user site global.

## Quick Start (Recommended)

### Option A: Full Docker (Most Reliable)

```bash
# 1. Clone repository
git clone https://github.com/aldrndev/vibe-creator.git
cd contencreative

# 2. Copy Docker env files
cp infra/compose/.env.docker.infra.example infra/compose/.env.docker.infra
cp infra/compose/apps/api/.env.docker.example infra/compose/apps/api/.env.docker

# 3. Start all services
pnpm docker:up:build

# 4. Verify
pnpm docker:ps
curl http://localhost:3000/health
```

**Services running:**

- API: http://localhost:3000
- Swagger: http://localhost:3000/documentation
- PostgreSQL: localhost:5433
- Redis: localhost:6379
- Cobalt: localhost:9000

### Option B: Hybrid (Docker Infra + App Lokal)

```bash
# 1. Clone repository
git clone https://github.com/aldrndev/vibe-creator.git
cd contencreative

# 2. Install dependencies
pnpm install

# 3. Setup API environment
cp apps/api/.env.example apps/api/.env
# Edit apps/api/.env with your values

# 4. Setup Python virtualenv for transcription
pnpm api:python:setup

# 5. Start infrastructure only
pnpm docker:infra:up

# 6. Start development servers
pnpm dev
```

**Services running:**

- Web: http://localhost:5173
- API: http://localhost:3000
- PostgreSQL: localhost:5433
- Redis: localhost:6379
- Cobalt: localhost:9000

### Recommended Hybrid Flow

Untuk workflow harian tanpa rebuild Docker tiap ada perubahan code:

```bash
pnpm docker:infra:up
pnpm api:python:setup
pnpm dev
```

Kalau virtual environment Python sudah pernah dibuat dan dependency tidak berubah, cukup:

```bash
pnpm docker:infra:up
pnpm dev
```

## Environment Variables

### Required

| Variable             | Description           | Example                                                      |
| -------------------- | --------------------- | ------------------------------------------------------------ |
| `DATABASE_URL`       | PostgreSQL connection | `postgresql://postgres:postgres@localhost:5433/vibe_creator` |
| `REDIS_URL`          | Redis connection      | `redis://localhost:6379`                                     |
| `JWT_SECRET`         | Min 32 chars          | (generate with `openssl rand -base64 48`)                    |
| `JWT_REFRESH_SECRET` | Min 32 chars          | (generate with `openssl rand -base64 48`)                    |
| `JWT_SIGNING_KEY`    | ES256 JWK             | (generate with script below)                                 |

### Generate JWT Keys

```bash
node -e "
const { generateKeyPairSync } = require('crypto');
const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
console.log('JWT_SIGNING_KEY=' + JSON.stringify(privateKey.export({ format: 'jwk' })));
console.log('JWT_VERIFY_KEYS=' + JSON.stringify([publicKey.export({ format: 'jwk' })]));
"
```

### Optional (Features)

| Variable               | Feature       |
| ---------------------- | ------------- |
| `OPENAI_API_KEY`       | AI Director   |
| `XENDIT_SECRET_KEY`    | Payments      |
| `R2_*`                 | Cloud storage |
| `TURNSTILE_SECRET_KEY` | Captcha       |
| `WHISPER_MODEL_SIZE`   | Model transcribe lokal (`small` default) |

## Common Commands

### Development

```bash
# Start all (web + api)
pnpm dev

# Start individually
pnpm web          # Frontend only
pnpm api          # Backend only

# Setup Python venv untuk transcribe lokal
pnpm api:python:setup
pnpm api:python:install

# Database
pnpm --filter @vibe-creator/api exec prisma studio     # DB GUI
pnpm --filter @vibe-creator/api exec prisma migrate dev  # New migration
pnpm --filter @vibe-creator/api exec prisma generate    # Regenerate client
```

### Testing

```bash
# Run all tests
pnpm test

# API tests only
pnpm --filter @vibe-creator/api test

# Specific test
pnpm --filter @vibe-creator/api test -- ffmpeg
```

### Code Quality

```bash
pnpm lint          # ESLint
pnpm typecheck     # TypeScript
pnpm layout:check  # Blueprint compliance
```

## Docker Commands

```bash
# Start infra only for hybrid mode
pnpm docker:infra:up

# Stop infra only
pnpm docker:infra:down

# Restart infra only
pnpm docker:infra:restart

# Start full dev stack in Docker
pnpm docker:up

# View logs
pnpm docker:logs

# Rebuild after code changes
pnpm docker:up:build

# Stop all
pnpm docker:down

# Reset (remove volumes)
docker compose -f infra/compose/docker-compose.dev.yml down -v
```

## AI Director Local Requirements

Kalau AI Director dijalankan lewat `pnpm dev`, processing lokal membutuhkan:

- `python3`
- `ffmpeg`
- `yt-dlp`
- `apps/api/venv` hasil `pnpm api:python:setup`

Catatan:

- `faster-whisper` tidak perlu dipasang global di Mac.
- API akan otomatis memakai `apps/api/venv/bin/python` jika tersedia.
- Kalau `venv` project tidak ada, backend akan fallback ke `python3` global.

## Troubleshooting

### Prisma Type Errors

```bash
pnpm --filter @vibe-creator/api exec prisma generate
```

### Port Already in Use

```bash
# Find process
lsof -i :3000
# Kill process
kill -9 <PID>
```

### Docker Container Conflicts

```bash
docker rm -f vibe-creator-server vibe-creator-db vibe-creator-redis vibe-creator-cobalt
```

### AI Director Transcribe Tidak Jalan di Hybrid Mode

1. Pastikan `python3` terpasang.
2. Pastikan `ffmpeg -version` berhasil.
3. Pastikan `yt-dlp --version` berhasil.
4. Jalankan `pnpm api:python:setup`.
5. Restart `pnpm dev`.

### Warning `pip` Script Not on PATH

Kalau warning ini muncul saat Anda dulu menginstal `faster-whisper` secara global, itu bukan error fatal. Workflow yang direkomendasikan sekarang adalah memakai virtual environment project, bukan Python user site global.

Kalau ingin membersihkan install global lama:

```bash
python3 -m pip uninstall faster-whisper
python3 -m pip uninstall yt-dlp
```

### Database Connection Failed

1. Check PostgreSQL is running: `docker ps | grep postgres`
2. Check `DATABASE_URL` format
3. Ensure port 5433 is accessible

### Redis Connection Failed

1. Check Redis is running: `docker ps | grep redis`
2. Verify `REDIS_URL` is correct

## IDE Setup

### VS Code Extensions

- Biome
- Prisma
- Tailwind CSS IntelliSense
- TypeScript

### Recommended Settings

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "biomejs.biome",
  "typescript.tsdk": "node_modules/typescript/lib"
}
```
