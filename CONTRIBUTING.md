# Contributing Guide

## Development Setup

### Prerequisites

- Node.js 20+
- pnpm 9+
- Docker & Docker Compose
- FFmpeg (for local dev without Docker)

### Quick Start

```bash
# Clone repository
git clone <repo-url>
cd contencreative

# Install dependencies
pnpm install

# Setup environment
cp apps/api/.env.example apps/api/.env

# Start Docker services
docker compose -f infra/compose/docker-compose.dev.yml up -d postgres redis

# Generate Prisma client
pnpm --filter @vibe-creator/api exec prisma generate

# Run migrations
pnpm --filter @vibe-creator/api exec prisma migrate dev

# Start development
pnpm dev
```

## Coding Standards

We follow the **Digitesia Engineering Standard v3.6.7**.

### TypeScript

- `any` is FORBIDDEN
- Explicit types required
- Zod for runtime validation

### File Size Limits

- Backend: MAX 400 LOC
- Frontend: MAX 500 LOC

### Naming Conventions

- Files/dirs: `kebab-case`
- Variables/functions: `camelCase`
- Environment vars: `UPPER_SNAKE_CASE`

## Git Workflow

### Branch Naming

```
feat/short-description
fix/short-description
chore/short-description
```

### Commit Convention

Follow Conventional Commits:

```
feat: add user authentication
fix: resolve token refresh bug
chore: update dependencies
docs: add API documentation
```

### Pull Request Process

1. Create feature branch from `main`
2. Make changes with tests
3. Run lint and tests locally
4. Create PR with description
5. Wait for review
6. Squash and merge

## Testing

```bash
# Run all tests
pnpm test

# Run API tests
pnpm --filter @vibe-creator/api test

# Run with coverage
pnpm --filter @vibe-creator/api test -- --coverage
```

### Test Requirements

- Unit tests for business logic
- Integration tests for API endpoints
- No snapshot tests allowed

## Code Review Checklist

- [ ] Code follows style guidelines
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No `any` types
- [ ] No console.log
- [ ] Error handling in place
- [ ] Security considerations addressed

## Questions?

Open an issue or contact the maintainers.
