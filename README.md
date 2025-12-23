# Vibe Creator

Platform all-in-one untuk daily content creation, dari ide hingga export.

## Tech Stack

- **Frontend**: React + Vite + TypeScript + HeroUI + TailwindCSS
- **Backend**: Fastify + TypeScript + Prisma + PostgreSQL
- **Queue**: BullMQ + Redis
- **Storage**: Cloudflare R2
- **Video**: FFmpeg
- **Download**: yt-dlp

## Getting Started

### Prerequisites

- Node.js >= 20
- pnpm >= 10
- Docker & Docker Compose
- FFmpeg
- yt-dlp

### Installation

```bash
# Install dependencies
pnpm install

# Start infrastructure (PostgreSQL, Redis)
docker compose up -d

# Run database migrations
pnpm db:migrate

# Start development
pnpm dev
```

### Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all apps in development mode |
| `pnpm server` | Start backend only |
| `pnpm web` | Start frontend only |
| `pnpm build` | Build all apps |
| `pnpm lint` | Run linting |
| `pnpm typecheck` | Run type checking |
| `pnpm db:migrate` | Run database migrations |
| `pnpm db:studio` | Open Prisma Studio |

## Project Structure

```
vibe-creator/
├── apps/
│   ├── web/          # React frontend
│   └── server/       # Fastify backend
├── packages/
│   └── shared/       # Shared types & utils
├── docker/           # Docker configurations
└── n8n/              # n8n workflows
```

## License

UNLICENSED - Private
