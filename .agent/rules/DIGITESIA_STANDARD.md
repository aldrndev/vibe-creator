---
trigger: always_on
---

# Digitesia Engineering Standard — v3.6.5

This standard is LAW. Any solution that violates this document is INVALID, even if it works, passes CI, is faster, or is “industry common”.

## PURPOSE (NON-NEGOTIABLE)

Override default human and AI behavior that optimizes for speed, shortcuts, or happy-path success.

## OUTPUT CONTRACT (ABSOLUTE)

- OUTPUT ONLY: .ts, .tsx, .json, .yaml, .sql, .md
- NO explanations, NO conversational text, NO emojis
- PRODUCTION-READY ONLY
- If ANY requirement is unclear → FAIL FAST with:
  // TODO: requirements unclear

## AI COMPLIANCE GATE (ABSOLUTE)

AI MUST operate in COMPLIANCE MODE.

AI MUST:

- Treat this document as hard constraints
- Prefer explicit, boring, reversible designs
- Reject shortcut solutions even if functional
- STOP when requirements are incomplete

AI MUST NOT:

- Guess intent
- Fill gaps with assumptions
- Optimize for speed or brevity

### Context Priority Rule

If context window is limited, prioritize reading in this order:

1. Type Definitions / Interfaces / Schemas (Source of Truth)
2. Configuration / Env Validation
3. Core Business Logic (Services)
4. Implementation Details (Controllers/UI)

Violation of ANY rule invalidates the output.

## CODE QUALITY (ABSOLUTE)

### ESLint

- no-console: warn
- @typescript-eslint/no-explicit-any: error
- @typescript-eslint/no-deprecated: error
- @typescript-eslint/no-unused-vars: warn (argsIgnorePattern: ^\_)

### Type Safety

- any FORBIDDEN
- unknown ONLY when unavoidable with explicit narrowing
- Deprecated APIs FORBIDDEN

### Self-Documenting Code

- TSDoc/JSDoc REQUIRED for all exported functions, classes, and interfaces
- Comments must explain WHY, not WHAT (logic intent over implementation detail)
- "Magic numbers" FORBIDDEN (extract to constants with comments)

## DEPENDENCY & SUPPLY CHAIN (ABSOLUTE)

- Dependencies MUST be installed with exact versions
- latest, ^, ~, \* FORBIDDEN
- Lockfile REQUIRED and committed
- Node & pnpm versions pinned
- CI MUST fail on critical vulnerabilities
- SBOM REQUIRED for release artifacts
- Unverified or transitive-only deps FORBIDDEN

## VALIDATION (ABSOLUTE)

Zod REQUIRED for:

- API input/output
- Environment variables
- DTOs (schema-first)

Implicit trust in client data FORBIDDEN.

## NAMING & MODULE BOUNDARIES

- Files/directories: kebab-case
- Variables/functions: camelCase
- Env vars: UPPER_SNAKE_CASE
- Path aliases REQUIRED:
  - @/ → local package
  - @pkg/\* → cross-package
- Relative imports ../../ FORBIDDEN

### Feature Boundary Rule (AUTHORITATIVE)

- One feature = one domain module
- Cross-feature imports FORBIDDEN
- Shared logic ONLY in explicit shared packages
- Feature access ONLY via public barrel exports
- Boundary enforcement REQUIRED (ESLint / TS references)

## CONTINUOUS INTEGRATION (AUTHORITATIVE)

CI MUST run on every push & PR:

- lint
- typecheck
- build
- tests (if present)
- dependency & secret scan

Merge to main/master FORBIDDEN if CI fails.

### Commit Convention

- Conventional Commits format REQUIRED (feat, fix, chore, docs, refactor, perf, test, ci)
- Breaking changes must be explicitly marked in footer
- Imperative mood REQUIRED ("Add feature" NOT "Added feature")

## OBSERVABILITY (ABSOLUTE)

- Structured logging REQUIRED
- Global error handler REQUIRED
- requestId REQUIRED
- Correlation REQUIRED: requestId → jobId

### Logging Standards

Required fields:

- service, env, version
- requestId, jobId
- tenantId, userId (pseudonymous)
- route, latencyMs

Redaction REQUIRED:

- secrets, tokens, credentials, full PII

### Tracing

- OpenTelemetry REQUIRED
- Sampling REQUIRED (default head-based)
- High-cardinality attributes FORBIDDEN
- Large payloads in logs/traces FORBIDDEN

### Metrics & Alerts

Metrics REQUIRED:

- API latency p95/p99
- Error rate
- Queue depth
- Job duration p95/p99
- Worker CPU/RAM
- Disk usage

Alerts REQUIRED:

- Queue stuck
- Failure spike
- Disk below threshold
- Redis memory high

## SECURITY (ABSOLUTE)

- Secrets NEVER committed
- .env.example REQUIRED
- Token-based auth ONLY
- Access tokens short-lived
- Refresh token rotation + replay detection REQUIRED
- JWT key rotation REQUIRED (kid + multi-key)
- Tokens NOT in localStorage
- CSRF protection REQUIRED for cookies
- Admin MFA REQUIRED
- Step-up auth REQUIRED for sensitive actions

### Token Storage

- Web: HttpOnly, Secure, SameSite cookies
- Mobile: Keychain / Keystore ONLY

## AUTHORIZATION & TENANCY (ABSOLUTE)

- Zero-trust: assume attacker is authenticated
- Authorization enforced server-side on EVERY request
- Central policy model REQUIRED (deny-by-default)
- Tenant isolation REQUIRED:
  - tenantId MUST be enforced at repository layer
  - Unscoped queries FORBIDDEN
- IDOR protection REQUIRED
- Sequential / guessable IDs FORBIDDEN (UUID/opaque only)

## SECURITY HARDENING

- Mass assignment FORBIDDEN (explicit allowlist REQUIRED)
- Error messages MUST NOT reveal:
  - Resource existence
  - Authorization logic
  - Internal identifiers

### Network & Headers

- SSRF protection REQUIRED (allowlists, private IP block, DNS rebinding defense)
- Egress default-deny REQUIRED
- Security headers REQUIRED:
  CSP (frame-ancestors), X-Content-Type-Options,
  Referrer-Policy, Permissions-Policy

### Webhooks

- Signature + timestamp verification REQUIRED
- Replay protection REQUIRED
- Idempotency REQUIRED

### Audit Logging

- Immutable append-only sink REQUIRED
- Events: auth, admin, payments, role changes, exports, deletes
- Correlation via requestId/jobId REQUIRED

## BACKEND — FASTIFY

Stack: fastify, typescript(strict), zod, prisma, postgresql, pino

- Thin controllers ONLY
- Business logic in services
- DB access ONLY in repositories
- Global error handler REQUIRED
- API versioning REQUIRED (/api/v1)
- Pagination REQUIRED (default 20, max 100)
- Max file size: 400 Line of Code (Strict)

### Scale & Failure Controls

- Timeouts REQUIRED for ALL I/O
- Circuit breaker + bounded retries REQUIRED
- Backpressure REQUIRED:
  - DB hot → shed load / 503
  - Queue deep → pause enqueue
- Rate limiting REQUIRED (tenant + user; IP-only FORBIDDEN)

## DATABASE

- Prisma ONLY
- Manual DB changes FORBIDDEN
- UTC timestamps ONLY
- Currency as integers
- Soft delete default
- Transactions REQUIRED for multi-aggregate writes

### DB Safety & Scale

- Connection pooling REQUIRED
- Query budgets REQUIRED for hot endpoints
- Index REQUIRED for every query path
- Cursor pagination REQUIRED for high-cardinality lists
- Migration safety REQUIRED (expand/contract only)

### Destructive Operations

- DROP COLUMN / DROP TABLE forbidden in automated migrations if data exists
- Data backfill scripts REQUIRED for new non-nullable columns
- Raw SQL execution FORBIDDEN unless wrapped in a transaction with explicit rollback logic

## BACKGROUND JOBS

Stack: BullMQ + Redis

- Jobs MUST be idempotent
- Idempotency key REQUIRED:
  jobType:resourceId:inputHash:settingsHash
- Explicit job state machine REQUIRED
- Retry, backoff, timeout REQUIRED
- Dead-letter queue REQUIRED
- CPU-heavy vs IO-heavy queues SEPARATE
- Redis HA REQUIRED

## CACHING

- Redis REQUIRED (HA)
- TTL REQUIRED for all keys
- Invalidate on mutation
- Cache stampede protection REQUIRED
- User-specific data MUST NOT be cached at CDN

## FRONTEND — REACT

Stack: react, vite, typescript, react-query, zustand, react-hook-form, zod, tailwindcss, radix-ui

- Server state: React Query
- Client state: Zustand (slice-based)
- Direct fetch FORBIDDEN
- Error boundaries REQUIRED
- Suspense REQUIRED for lazy loading
- Stable keys REQUIRED
- Max component size: 500 Line of Code (Strict)

### UI / UX

- Radix UI ONLY
- Tailwind with semantic CSS variables ONLY
- Prebuilt kits FORBIDDEN unless internal-owned
- Accessibility REQUIRED (min 44x44px)
- Placeholders MUST NOT replace labels
- Animations ONLY if UX-justified

### SEO & i18n

- Semantic HTML5
- Single H1 per page
- Proper heading hierarchy
- Meta tags: title, description, og:\*
- i18n: ID + EN, auto-detect, fallback EN
- Avoid layout shift (CLS ≤ 0.1)
- LCP ≤ 2.5s

## FRAMEWORK-SPECIFIC RULES

### Next.js

- RSC caching MUST NOT be relied upon for correctness
- loading.tsx is lifecycle, not UX
- Experimental flags MUST NOT define core behavior

### React Query

- initialData shortcuts FORBIDDEN
- Manual refetch hacks FORBIDDEN
- Proper hydration REQUIRED
- Mutations MUST invalidate queries

## MOBILE — EXPO

Stack: expo, expo-router, react-native, nativewind v4, zustand, react-query, zod

- Secure storage: Keychain / Keystore ONLY
- AsyncStorage FORBIDDEN for secrets
- Accessibility REQUIRED

## DOCKER

- Dockerfile + docker-compose REQUIRED
- Multi-stage builds REQUIRED
- Containers run as non-root
- Image versions pinned (NO latest)
- Health checks REQUIRED

## MONOREPO (IF APPLICABLE)

- pnpm + workspaces REQUIRED
- Root scripts:
  - pnpm server
  - pnpm web
  - pnpm mobile
  - pnpm dev

## TESTING

- Deterministic tests ONLY
- Snapshot tests FORBIDDEN
- Negative tests REQUIRED
- Minimum high-risk coverage:
  - Authorization policies
  - Tenant isolation
  - Job idempotency
  - Webhook verification

## FORBIDDEN SHORTCUTS

- any for speed
- console.log
- DB access in controllers
- !important
- @ts-ignore without documented reason
- Hardcoded URLs or secrets

## HA / DR / SLO (PRODUCTION)

- SLOs REQUIRED
- Multi-instance, multi-AZ REQUIRED
- Backups + restore drills REQUIRED
- Canary deploy + automated rollback REQUIRED

## CHANGE SAFETY RULE (ABSOLUTE)

Any solution that is hard to roll back, hides bugs, or relies on undocumented behavior is FORBIDDEN.

## PRECEDENCE RULE

1. Security
2. Correctness
3. Reliability
4. Maintainability
5. Performance
6. Convenience

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

## EXCEPTION PROTOCOL (ABSOLUTE)

Rule violations ONLY allowed via:

- Written justification
- Scoped impact
- Time limit
- Rollback plan
- Explicit approver

Exceptions are temporary and tracked.
