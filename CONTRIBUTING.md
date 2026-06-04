# Contributing to Vibe Creator

Thank you for helping improve Vibe Creator. This repository is a full-stack
creator-video workspace with security-sensitive surfaces such as auth, media
uploads, export jobs, RTMP stream keys, billing/quota, and admin tools. Please
keep changes explicit, reviewed, and easy to verify.

## Before You Start

1. Read `PROJECT.yaml`.
2. Read the active rules in `.agents/rules/`.
3. Check the relevant feature code before proposing or implementing changes.
4. Keep changes small enough to review.
5. Do not commit secrets, local `.env` files, generated media, or private test
   assets.

## Ways to Contribute

- Bug fixes with a clear reproduction and regression test.
- UI/UX polish that follows the existing Vibe Creator design language.
- Backend/API improvements with Zod validation and owner-safe authorization.
- Media pipeline fixes for FFmpeg, export, loop, reaction, and streaming flows.
- Documentation improvements for setup, deployment, and developer workflows.
- Security hardening and safe error handling.

## Local Development

### Requirements

- Node.js 20+
- pnpm 10.26.1
- Docker and Docker Compose
- FFmpeg for media processing
- Python 3 when working on API media helper scripts

### Setup

```bash
git clone <repository-url>
cd contencreative
pnpm install

cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
cp infra/compose/.env.docker.infra.example infra/compose/.env.docker.infra

pnpm docker:infra:up
pnpm db:generate
pnpm db:migrate
pnpm dev
```

### Useful Commands

| Command | Purpose |
| --- | --- |
| `pnpm web` | Run the React/Vite frontend |
| `pnpm api` | Run the Fastify API |
| `pnpm lint` | Run Biome checks |
| `pnpm typecheck` | Run TypeScript checks |
| `pnpm test` | Run tests |
| `pnpm build` | Build the workspace |
| `pnpm docker:infra:up` | Start local Postgres/Redis/support services |
| `pnpm docker:infra:down` | Stop local infrastructure |

## Coding Standards

Vibe Creator follows the project rules in `.agents/rules/`. The most important
rules are:

- TypeScript strict mode only.
- Do not use `any`.
- Do not use `console.log` in production code.
- Use Zod for API input/output, DTOs, and environment validation.
- Keep frontend components under the project file-size limits.
- Keep backend controllers thin; put business logic in services and database
  access in repositories.
- Use TanStack Query for server state.
- Use TanStack Router for Vite route/search params.
- Use semantic Tailwind tokens and existing UI primitives.
- Do not introduce hardcoded secrets, internal URLs, or raw filesystem paths in
  user-facing responses.

## Architecture Guidelines

### Frontend

- Routes live under the web app route structure and should use typed search
  params where applicable.
- Components should be pure where possible.
- API calls should go through existing services/hooks, not direct `fetch` in
  components.
- Loading, empty, and error states must be designed, not left blank.
- Mobile layouts must remain usable at 320px width and must not be hidden behind
  the bottom nav.

### Backend

- API routes use `/api/v1`.
- Every endpoint must validate request and response data.
- Authorization must be checked server-side for every protected resource.
- Errors returned to users must be safe and actionable.
- Logs must not contain secrets, stream keys, tokens, passwords, webhook
  payloads, or full PII.
- Background jobs must be idempotent and bounded.

### Media and Streaming

- Probe media metadata before building FFmpeg graphs.
- Handle silent video and muted audio paths explicitly.
- Never expose raw local output paths to the frontend.
- Export/download/stream actions must be owner-safe and lifecycle-aware.
- Stream keys are only used to start the stream process and must not be stored
  or logged in plaintext.

## Testing Expectations

Run the smallest meaningful set of checks for your change, then the full gates
before merge.

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Required test coverage:

- Bug fixes need regression tests.
- Validation logic needs unit tests.
- Authorization and ownership changes need negative tests.
- Queue, export, billing, and streaming changes need lifecycle/failure tests.
- UI behavior changes should include component or utility tests when practical.

Tests should be deterministic. Do not rely on real external SaaS calls, arbitrary
sleep timers, or network-only fixtures.

## Git Workflow

Use short-lived branches from `main`.

Recommended branch names:

```text
feat/short-description
fix/short-description
docs/short-description
refactor/short-description
test/short-description
```

Use Conventional Commits:

```text
feat: add reaction recorder preview controls
fix: clear expired ai director session on manual entry
docs: refresh open source setup guide
```

## Pull Request Checklist

Before opening or requesting review:

- [ ] The change is focused and reversible.
- [ ] README/docs are updated when behavior or setup changes.
- [ ] Tests are added or updated for logic changes.
- [ ] `pnpm lint` passes.
- [ ] `pnpm typecheck` passes.
- [ ] Relevant tests pass.
- [ ] `pnpm build` passes before merge.
- [ ] No `any`, `console.log`, hardcoded secrets, or raw internal paths.
- [ ] User-facing errors are safe and understandable.
- [ ] Mobile and desktop UI are checked for visual changes.

## Security Reporting

Please do not open a public issue with exploit details. If you find a security
problem, contact the maintainers privately and include:

- Affected route, feature, or module.
- Reproduction steps.
- Expected impact.
- Whether the issue exposes secrets, project assets, user data, billing/quota,
  stream keys, or admin actions.

Maintainers should verify the report, patch the root cause, add regression tests,
and publish an appropriate advisory or changelog note when safe.

## Documentation Contributions

Documentation should be practical and accurate:

- Prefer real commands over prose-only guidance.
- Do not document routes, features, or integrations that do not exist.
- Avoid fake credentials, placeholder claims, and dead links.
- Keep setup instructions aligned with `package.json`, `apps/api/.env.example`,
  `apps/web/.env.example`, and `infra/compose`.

## License

Contributions will be governed by the repository license once the maintainers
select and publish a root `LICENSE` file. Do not copy code from incompatible
licenses into this repository.
