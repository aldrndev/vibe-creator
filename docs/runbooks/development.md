# Development Setup Runbook

## Prerequisites

| Requirement | Version | Check Command      |
| ----------- | ------- | ------------------ |
| Node.js     | 20+     | `node --version`   |
| pnpm        | 9+      | `pnpm --version`   |
| Docker      | Latest  | `docker --version` |
| FFmpeg      | Latest  | `ffmpeg -version`  |

## Quick Start (Recommended)

### Option A: Full Docker (Most Reliable)

```bash
# 1. Clone repository
git clone https://github.com/aldrndev/vibe-creator.git
cd contencreative

# 2. Start all services
docker compose -f infra/compose/docker-compose.dev.yml up -d --build

# 3. Verify
docker ps
curl http://localhost:3000/health
```

**Services running:**

- API: http://localhost:3000
- Swagger: http://localhost:3000/documentation
- PostgreSQL: localhost:5433
- Redis: localhost:6379
- Cobalt: localhost:9000

### Option B: Hybrid (Docker DB + Local API)

```bash
# 1. Clone repository
git clone https://github.com/aldrndev/vibe-creator.git
cd contencreative

# 2. Install dependencies
pnpm install

# 3. Start infrastructure only
docker compose -f infra/compose/docker-compose.dev.yml up -d postgres redis

# 4. Setup API environment
cp apps/api/.env.example apps/api/.env
# Edit apps/api/.env with your values

# 5. Generate Prisma client
pnpm --filter @vibe-creator/api exec prisma generate

# 6. Run migrations
pnpm --filter @vibe-creator/api exec prisma migrate dev

# 7. Start development servers
pnpm dev
```

**Services running:**

- Web: http://localhost:5173
- API: http://localhost:3000

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

## Common Commands

### Development

```bash
# Start all (web + api)
pnpm dev

# Start individually
pnpm web          # Frontend only
pnpm api          # Backend only

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
# Start all
docker compose -f infra/compose/docker-compose.dev.yml up -d

# View logs
docker logs -f vibe-creator-server

# Rebuild after code changes
docker compose -f infra/compose/docker-compose.dev.yml up -d --build

# Stop all
docker compose -f infra/compose/docker-compose.dev.yml down

# Reset (remove volumes)
docker compose -f infra/compose/docker-compose.dev.yml down -v
```

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

### Database Connection Failed

1. Check PostgreSQL is running: `docker ps | grep postgres`
2. Check `DATABASE_URL` format
3. Ensure port 5433 is accessible

### Redis Connection Failed

1. Check Redis is running: `docker ps | grep redis`
2. Verify `REDIS_URL` is correct

## IDE Setup

### VS Code Extensions

- ESLint
- Prettier
- Prisma
- Tailwind CSS IntelliSense
- TypeScript

### Recommended Settings

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "typescript.tsdk": "node_modules/typescript/lib"
}
```
