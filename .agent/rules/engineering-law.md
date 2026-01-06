---
trigger: always_on
---

# Digitesia Engineering Standard — v3.6.1 (FINAL)

## PURPOSE (NON-NEGOTIABLE)

This standard exists to override default human and AI behavior that optimizes for speed, shortcuts, or happy-path success.
All rules below are LAW, not guidelines.

Any solution that violates this document is INVALID, even if it:

- Works
- Passes CI
- Is faster to implement
- Is “industry common”
- Is suggested by AI

## OUTPUT CONTRACT (ABSOLUTE)

- OUTPUT ONLY: .ts, .tsx, .json, .yaml, .sql, .md
- NO explanations
- NO conversational text
- NO emojis
- PRODUCTION-READY ONLY
- If ANY requirement is unclear → FAIL FAST with:
  // TODO: requirements unclear

## AI COMPLIANCE GATE (ABSOLUTE)

AI MUST operate in COMPLIANCE MODE, not SOLUTION MODE.

AI MUST:

- Treat this document as hard constraints
- Reject shortcut solutions even if functional
- Prefer boring, explicit, reversible designs
- STOP and FAIL FAST when requirements are incomplete

AI MUST NOT:

- Guess intent
- Fill gaps with assumptions
- Optimize for brevity or speed
- Use “common practice” to bypass rules

Violation of ANY rule invalidates the entire output.

## CODE QUALITY (ABSOLUTE)

### ESLint (MANDATORY)

Rules:

- no-console: warn
- @typescript-eslint/no-explicit-any: error
- @typescript-eslint/no-unused-vars: warn (argsIgnorePattern: ^\_)
- @typescript-eslint/no-deprecated: error

### Type Safety

- any STRICTLY FORBIDDEN
- unknown ONLY when unavoidable + explicit narrowing
- Deprecated APIs / libraries STRICTLY FORBIDDEN

## DEPENDENCY POLICY (PRODUCTION-SAFE)

- New dependencies MAY be installed using package@latest
- After installation:
- Version MUST be pinned
- Lockfile MUST be committed
- Floating versions FORBIDDEN: latest, \*, ^, ~
- Production codebases MUST be reproducible

### Security Cadence

- Critical security updates MUST be applied within 14 days
- CI MUST fail on critical vulnerability findings

## VALIDATION (ABSOLUTE)

- Zod REQUIRED for:
- API input/output
- Environment variables
- DTOs (schema-first)
- Implicit trust in client data FORBIDDEN

## NAMING & IMPORTS

- Files: kebab-case.suffix.ts
- Directories: kebab-case
- Variables / functions: camelCase
- Env vars: UPPER_SNAKE_CASE
- Path aliases @/ REQUIRED
- Relative imports ../../ FORBIDDEN
- Cross-feature imports FORBIDDEN

### Feature Boundary Rule

- A feature = one domain module
- Cross-feature imports FORBIDDEN
- Shared logic MUST live in explicit shared packages
- Feature access ONLY via public barrel exports

## CONTINUOUS INTEGRATION (CI)

- CI MUST run on every push & pull request
- Merge to main/master FORBIDDEN if CI fails
- CI MUST run at minimum:
- lint
- typecheck
- build
- test (if present)
- dependency policy check
- secret scan

CI is authoritative; local checks non-binding.

## OBSERVABILITY (ABSOLUTE)

- Structured logging REQUIRED
- requestId REQUIRED
- Correlation REQUIRED: requestId → jobId
- Global error handler REQUIRED
- Raw errors & stack traces MUST NOT be exposed

### Required Metrics

- API latency p95 / p99
- Error rate
- Queue depth
- Job duration p95 / p99
- Worker CPU / RAM
- Disk usage

### Alerts REQUIRED

- Queue stuck
- Failure spike
- Disk below threshold
- Redis memory high

Observability OPTIONAL ONLY in PROTOTYPE_MODE.

## UI / UX REQUIREMENTS

### Pre-Implementation Questions (MANDATORY)

AI MUST ask:

1. Theme: dark / light / both (toggle)
2. Language: ID / EN / ID+EN (auto-detect)
3. Frontend Framework (ONLY if not already defined):

- React (Vite)
- Next.js

### UI Stack (ABSOLUTE)

- Headless primitives: Radix UI
- Styling: Tailwind CSS (custom components)
- Prebuilt component kits (e.g. shadcn/ui) FORBIDDEN as dependency

### Design System

- Semantic CSS variables REQUIRED
- Tokens ONLY:
- --color-\*
- --space-\*
- --font-size-\*
- Theme switching via CSS variables
- Hardcoded colors FORBIDDEN

### Visual Standards

- Premium, modern, professional aesthetic
- Mobile-first responsive
- Pixel-perfect
- Animations ONLY when they add UX value
- Decorative-only animations FORBIDDEN
- Min touch target: 44x44px
- Accessibility labels REQUIRED
- Placeholders MUST NOT replace labels

### i18n

- ID + EN
- Auto-detect language
- Fallback: EN

### SEO & Performance

- Semantic HTML5
- Single H1 per page
- Proper heading hierarchy
- Meta tags: title, description, og:\*
- Lazy loading & code splitting
- Avoid layout shift (CLS ≤ 0.1)
- LCP ≤ 2.5s

## BACKEND — FASTIFY

Stack: fastify, typescript (strict), zod, prisma, postgresql, pino

- Thin controllers ONLY
- Business logic in services
- DB access ONLY in repositories
- Global error handler REQUIRED
- API versioning REQUIRED: /api/v1
- Pagination REQUIRED (default 20, max 100)

## DATABASE

- Prisma ONLY
- Manual DB changes FORBIDDEN
- Raw SQL ONLY if performance-critical, parameterized, documented
- UTC timestamps ONLY
- Currency as integers
- Soft delete default
- Transactions REQUIRED for multi-aggregate mutations

## API RESPONSE CONTRACT (ABSOLUTE)

- Success:
  { success: true, data: {}, meta: {} }

- Error:
  { success: false, error: { code: ERROR_CODE, message: string } }

- HTTP status codes MUST be semantic
- Raw errors MUST NOT be exposed

## FRONTEND — REACT

Stack: react, vite, typescript, @tanstack/react-query, zustand, react-hook-form, zod, tailwindcss, radix-ui

- Server state: React Query
- Client state: Zustand (slice-based)
- Forms: react-hook-form
- Headless UI: Radix UI ONLY
- Prebuilt UI kits FORBIDDEN
- Direct fetch FORBIDDEN
- Max component size: 300 lines
- Stable keys REQUIRED
- Error boundaries at route level
- Suspense for lazy loading
- UI components MUST be owned, explicit, auditable

## MOBILE — EXPO

Stack: expo, expo-router, react-native, nativewind v4, zustand, react-query, zod

- Secure storage: Keychain / Keystore
- AsyncStorage FORBIDDEN for secrets
- Accessibility labels REQUIRED
- Min touch target: 44x44px

## SECURITY (ABSOLUTE)

- Secrets NEVER committed
- .env.example REQUIRED
- Token-based auth ONLY
- Access tokens short-lived
- Refresh tokens revocable
- Tokens NOT in localStorage
- CSRF protection REQUIRED for cookies
- Rate limiting REQUIRED

## SECURITY HARDENING (ABSOLUTE)

- Assume attacker is authenticated (zero trust internal)
- Authorization MUST be enforced server-side on EVERY request
- Client-side checks are NON-SECURITY

### IDOR Protection

- Resource ownership MUST be verified
- Sequential / guessable IDs FORBIDDEN
- UUID / opaque identifiers REQUIRED

### Mass Assignment

- Explicit allowlist REQUIRED
- DTOs MUST NOT be spread blindly into persistence layers

### Rate Limiting

- Auth endpoints
- Payment endpoints
- Resource mutation endpoints

### Error Messages MUST NOT reveal

- Existence of resources
- Authorization logic
- Internal identifiers

- Cache MUST NOT store user-specific or sensitive data
- Cache-Control: private, no-store

## TESTING

- Service-level tests SHOULD exist
- Snapshot tests FORBIDDEN
- Tests MUST be deterministic
- At least one negative test REQUIRED

## BACKGROUND JOBS

Stack: BullMQ + Redis

- Jobs MUST be idempotent
- Idempotency key REQUIRED:
  jobType:resourceId:inputHash:settingsHash
- Explicit job state machine REQUIRED
- Retry, backoff, timeout REQUIRED
- Dead-letter queue REQUIRED
- Business logic NOT in workers

## CACHING

- Redis REQUIRED
- TTL REQUIRED for all keys
- Invalidate on mutation
- Key format: entity:id, entity:list:params
- User-specific data MUST NOT be cached at CDN layer

## DOCKER

- Dockerfile + docker-compose.yml REQUIRED
- Multi-stage builds
- .dockerignore mirrors .gitignore
- Env via compose or .env
- Hardcoded env FORBIDDEN
- Health checks REQUIRED
- Pin image versions (NO latest)
- Containers run as non-root

## MONOREPO (IF APPLICABLE)

- Package manager: pnpm + workspaces
- Root scripts:
- pnpm server
- pnpm web
- pnpm mobile
- pnpm dev

## FORBIDDEN SHORTCUTS

- any for speed
- console.log
- DB access in controllers
- !important
- @ts-ignore without reason
- Hardcoded URLs / secrets

## ARCHITECTURAL ROBUSTNESS (ABSOLUTE)

- Shortcut implementations FORBIDDEN, even if they pass lint/typecheck
- Prefer long-term maintainability over short-term simplicity
- Prefer explicit patterns over implicit behavior
- Fragile or “works-for-now” solutions FORBIDDEN
- Experimental features ONLY as optimization, not architecture

## DATA & STATE ARCHITECTURE (ABSOLUTE)

- Server cache MUST NOT be source of truth
- Client cache MUST NOT replace server validation
- Single source of truth REQUIRED
- Duplicate sources of truth FORBIDDEN

## FRAMEWORK-SPECIFIC BEST PRACTICE (ABSOLUTE)

### Next.js

- RSC caching MUST NOT be relied upon for correctness
- loading.tsx is lifecycle, not UX
- Experimental flags MUST NOT define core behavior

### React Query

- initialData shortcuts FORBIDDEN
- Proper hydration REQUIRED
- Mutations MUST invalidate queries
- Manual refetch hacks FORBIDDEN

## CHANGE SAFETY RULE (ABSOLUTE)

Any solution that is hard to roll back, hides bugs, or depends on undocumented behavior
is FORBIDDEN unless explicitly requested.

## AI DECISION RULE (ABSOLUTE)

When multiple solutions exist, AI MUST choose the one that is:

1. Most explicit
2. Most boring
3. Most widely accepted
4. Least dependent on framework magic
5. Safest under scale, concurrency, and future change
6. Shortcut because faster reasoning is INVALID.

## PROTOTYPE_MODE

Activated by: Use PROTOTYPE_MODE

- Tests & observability OPTIONAL
- Validation MINIMAL
- Expires after ONE response

Never relaxed:

- any forbidden
- No secrets
- Parameterized SQL
- Token-based auth
