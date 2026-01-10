# Digitesia Engineering Standard — v3.6.7

This standard is LAW. Any solution that violates this document is INVALID, even if it works, passes CI, is faster, or is “industry common”.

## PURPOSE (NON-NEGOTIABLE)

Override default human and AI behavior that optimizes for speed, shortcuts, or happy-path success.

Design priorities, in strict order:

1. Security
2. Correctness
3. Reliability
4. Maintainability
5. Performance
6. Convenience

Any tradeoff that violates this order is FORBIDDEN.

## OUTPUT CONTRACT (ABSOLUTE)

- OUTPUT ONLY: .ts, .tsx, .json, .yaml, .sql, .md
- NO explanations
- NO conversational text
- NO emojis
- PRODUCTION-READY ONLY
- If ANY requirement is unclear, FAIL FAST with:
  // TODO: requirements unclear

## AI COMPLIANCE GATE (ABSOLUTE)

AI MUST operate in COMPLIANCE MODE.

AI MUST:

- Treat this document as hard constraints
- Prefer explicit, boring, reversible designs
- Reject shortcut solutions even if functional
- STOP immediately when requirements are incomplete

AI MUST NOT:

- Guess intent
- Fill gaps with assumptions
- Optimize for speed or brevity

## CONTEXT PRIORITY RULE

When context is limited, prioritize reading in this order:

1. Type Definitions / Interfaces / Schemas (Source of Truth)
2. Configuration / Env Validation
3. Core Business Logic (Services)
4. Implementation Details (Controllers/UI)

Violation of this rule invalidates the output.

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
- Comments must explain WHY, not WHAT
- Magic numbers FORBIDDEN (extract to constants with comments)

### File Size Limits

- Backend files: MAX 400 Line of Code (Strict)
- Frontend components: MAX 500 Line of Code (Strict)

## DEPENDENCY & SUPPLY CHAIN (ABSOLUTE)

- Dependencies MUST be installed with exact versions
- latest, ^, ~, \* FORBIDDEN
- Lockfile REQUIRED and committed
- Node & pnpm versions pinned
- CI MUST fail on critical vulnerabilities
- SBOM REQUIRED for release artifacts
- Deprecated dependencies FORBIDDEN
- Unmaintained dependencies FORBIDDEN unless approved via Exception Protocol
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
- tests REQUIRED
- dependency & secret scan

Merge to main/master FORBIDDEN if CI fails.

## CONTINUOUS DELIVERY (AUTHORITATIVE)

- Production deployments MUST be automated from main/master only.
- Deployments MUST NOT run if CI is not green.
- Deployments MUST use immutable artifacts:
  - Docker images tagged with git SHA (required)
  - Mutable tags (latest) FORBIDDEN
- Deployment pipeline MUST include:
  - pre-deploy: pull artifact + verify digest
  - deploy: update service to new image
  - post-deploy: healthcheck gate with bounded timeout
  - rollback: automatic rollback to last-known-good artifact if healthcheck fails
- Deployment MUST be auditable:
  - record git SHA, operator (human/automation), timestamp, environment

## SUPPLY-CHAIN DEPLOY GATE (AUTHORITATIVE)

- Deployment MUST verify artifact digest before rollout.
- Deployment MUST fail if digest verification fails.
- Deployment MUST fail on critical vulnerability scan results unless approved via Exception Protocol.
- SBOM MUST be generated for every release artifact.

## RULE — TEST CO-CHANGE (AUTHORITATIVE)

- Any change to production code MUST include corresponding tests in the same PR.
- For every new feature or bug fix:
  - Unit tests MUST be added/updated immediately after the implementation is completed.
  - Negative tests REQUIRED for high-risk paths.
- High-risk domains MUST always have tests:
  - authorization policies (deny-by-default)
  - tenant isolation (repository layer)
  - job idempotency
  - webhook verification + replay protection (if applicable)
  - token rotation + replay detection
- PR is INVALID if production logic changes without tests.

### Commit Convention

- Conventional Commits format REQUIRED (feat, fix, chore, docs, refactor, perf, test, ci)
- Breaking changes must be explicitly marked in footer
- Imperative mood REQUIRED ("Add feature" NOT "Added feature")

## GIT WORKFLOW (TRUNK-BASED) (AUTHORITATIVE)

- Short-lived feature branches REQUIRED (deleted after merge)
- Long-lived development/staging branches FORBIDDEN
- Rebase workflow PREFERRED over merge commits for feature branches
- main/master history rewriting FORBIDDEN
- Branch naming convention:
  - type/short-description (e.g., feat/user-auth, fix/memory-leak)
  - Types: feat, fix, chore, refactor, docs, perf, test, ci

## DOCUMENTATION ENTRYPOINT (README) (ABSOLUTE)

The root README.md MUST contain:

1. Prerequisites: exact Node/Docker versions
2. Quick Start: commands to run locally
3. Environment: example env values and explanations
4. Architecture: high-level diagram (Mermaid/ASCII)
5. Commands: table of scripts (build, test, db:migrate, lint, typecheck)

Pointing to external wikis for "Getting Started" is FORBIDDEN.

## OBSERVABILITY (ABSOLUTE)

### Logging

- Structured logging REQUIRED
- Global error handler REQUIRED
- requestId REQUIRED
- Correlation REQUIRED: requestId → jobId

Required fields:

- service, env, version
- requestId, jobId
- tenantId, userId (pseudonymous)
- route, latencyMs

Redaction REQUIRED:

- secrets, tokens, credentials, full PII
- webhook payloads (store hash/ids only)

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
- Tokens NOT in localStorage
- CSRF protection REQUIRED for cookies
- Admin MFA REQUIRED
- Step-up auth REQUIRED for sensitive actions

### Token Storage

- Web: HttpOnly, Secure, SameSite cookies
- Mobile: Keychain / Keystore ONLY

## AUTHENTICATION — HYBRID TOKEN MODEL (AUTHORITATIVE)

### Access Token

- Stateless JWT
- Signed using jose
- Short-lived (MAX 15min)
- Mandatory claims: iss, aud, sub, tid, iat, exp, nbf
- Algorithm allowlist REQUIRED
- alg=none FORBIDDEN
- kid REQUIRED
- Clock skew tolerance MUST be explicitly defined
- Token payload MUST be minimal (no PII)

### JWT Key Management

- Key ring REQUIRED
- One active signing key
- Multi-key verification allowed
- Rotation MUST NOT log out active users
- Emergency revocation procedure REQUIRED
- Hardcoded keys FORBIDDEN

### Refresh Token

- Opaque reference token ONLY
- Cryptographically random (minimum 32 bytes)
- Stored ONLY as hash in DB
- Never logged
- JWT refresh tokens FORBIDDEN

### Refresh Rotation & Replay Detection

- Rotation on EVERY refresh
- Single-use refresh tokens
- Token family model REQUIRED
- Reuse of rotated token MUST revoke entire family

## AUTHORIZATION & TENANCY (ABSOLUTE)

- Zero-trust: assume attacker is authenticated
- Authorization enforced server-side on EVERY request
- Central policy model REQUIRED (deny-by-default)
- Tenant isolation REQUIRED:
  - tenantId MUST be enforced at repository layer
  - Unscoped queries FORBIDDEN
- IDOR protection REQUIRED
- Sequential / guessable IDs FORBIDDEN (UUID/opaque only)

### Non-Leak Rule

- Unauthorized access MUST return generic NotFound
- Resource existence MUST NOT be inferable
- Denied attempts MUST be recorded in audit logs

## SECURITY HARDENING

- Mass assignment FORBIDDEN (explicit allowlist REQUIRED)
- Error messages MUST NOT reveal:
  - resource existence
  - authorization logic
  - internal identifiers

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

## AUDIT LOGGING (ABSOLUTE)

- Immutable append-only sink REQUIRED
- Application role MUST NOT have update/delete permission
- Tamper detection REQUIRED

Events: auth, admin, payments, role changes, exports, deletes
Correlation via requestId/jobId REQUIRED

## ENVIRONMENT VARIABLES & CONFIGURATION (AUTHORITATIVE)

### Environment Levels

- NODE_ENV MUST be one of: development, staging, production
- Default NODE_ENV FORBIDDEN
- APP_ENV OPTIONAL but must use same values

### Validation

- Env consumed by an app MUST be Zod-validated at startup
- Missing required env MUST fail fast
- Silent fallbacks for secrets FORBIDDEN

### Secrets Rules

- Secrets MUST NOT have defaults
- Secrets MUST NOT be copied into Docker images
- Secrets MUST NOT be logged
- Secrets MUST NOT be present in client bundles

### .env File Rules (Monorepo)

- Root .env allowed ONLY for shared infra + compose-level non-secret vars in local dev
- Root .env MUST NOT contain application secrets
- Each app/container MUST use app-scoped env:
  - apps/api/.env
  - apps/worker/.env
  - apps/web/.env (public-only)

### Dotenv Loading Rules

- Shared packages MUST NOT load dotenv
- packages/config MUST NOT read files or load dotenv
- Only application entrypoints MAY load dotenv for local dev
- Production MUST inject env via orchestrator

### Client Environment Variables

- Web MUST use explicit public prefix (e.g. VITE*PUBLIC*)
- Non-public vars MUST NOT be accessible in client build
- Any variable without public prefix treated as secret-by-default

## DOCKER (AUTHORITATIVE)

- Dockerfile + docker-compose REQUIRED
- Multi-stage builds REQUIRED
- Containers run as non-root
- Image versions pinned (NO latest)
- Health checks REQUIRED
- .env files MUST NOT be baked into images
- Build-time ARG MUST NOT contain secrets
- Runtime secrets MUST be injected at container start

## RELEASE ARTIFACTS (AUTHORITATIVE)

- Every release MUST produce:
  - pinned Docker image (git SHA tag)
  - SBOM for the image
- Secrets MUST NOT be baked into images.
- Runtime configuration MUST be injected at container start (env/secret store).

### docker-compose Rules

- Allowed for local dev and CI
- Production orchestrator FORBIDDEN unless approved via Exception Protocol
- Compose MUST NOT contain secrets
- App services MUST use app-scoped env_file, not root secrets

## PRODUCTION ON VPS (SINGLE NODE) (AUTHORITATIVE)

- docker-compose is allowed as production orchestrator ONLY for single-node VPS deployments.
- Multi-AZ requirement is satisfied only by multi-node / multi-AZ orchestrators; for single-node VPS it MUST be recorded as a limitation with a migration plan.
- Production compose MUST include:
  - pinned images (by git SHA tag)
  - healthchecks gating
  - restart policy
  - explicit resource limits (cpu/memory) for noisy-neighbor control

### Compose Default Values Policy

- Non-secret defaults using ${VAR:-default} allowed
- Secret defaults FORBIDDEN
- Missing secrets MUST fail container startup

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
  - Token spend concurrency

## HA / DR / SLO (PRODUCTION)

- SLOs REQUIRED
- Multi-instance, multi-AZ REQUIRED
- Backups + restore drills REQUIRED
- Canary deploy + automated rollback REQUIRED
- Single-node VPS deployments MUST record “no multi-AZ” as a known limitation and MUST have a migration plan.

## DEPLOYMENT SAFETY (AUTHORITATIVE)

- Zero-downtime deployment PREFERRED (blue/green or rolling) for production.
- Health checks REQUIRED and MUST gate traffic.
- Rollback MUST be a single command and MUST be tested periodically.

## CHANGE SAFETY RULE (ABSOLUTE)

Any solution that is hard to roll back, hides bugs, or relies on undocumented behavior is FORBIDDEN.

## FORBIDDEN SHORTCUTS

- any for speed
- console.log
- DB access in controllers
- !important
- @ts-ignore without documented reason
- Hardcoded URLs or secrets
- Shared packages loading dotenv
- Root .env containing application secrets
- Secret defaults in docker-compose

## EXCEPTION PROTOCOL (ABSOLUTE)

Rule violations ONLY allowed via:

- Written justification
- Scoped impact
- Time limit
- Rollback plan
- Explicit approver

Exceptions are temporary and tracked.

# BACKEND — FASTIFY

Stack: fastify, typescript(strict), zod, prisma, postgresql, argon2, pino, nanoid, jose, bullmq, redis

- Thin controllers ONLY
- Business logic in services
- DB access ONLY in repositories
- Global error handler REQUIRED
- API versioning REQUIRED (/api/v1)
- Pagination REQUIRED (default 20, max 100)
- Max file size: 400 Line of Code (Strict)

## Scale & Failure Controls

- Timeouts REQUIRED for ALL I/O (DB, Redis, HTTP, Object Storage)
- Circuit breaker + bounded retries REQUIRED for external dependencies
- Retries MUST be bounded by:
  - max attempts
  - max elapsed time
  - idempotency guarantees (retry non-idempotent operations FORBIDDEN)
- Backpressure REQUIRED:
  - DB hot → shed load / 503
  - Queue deep → pause enqueue / reject new work
- Rate limiting REQUIRED (tenant + user; IP-only FORBIDDEN)
- Rate limiting MUST fail-closed for auth and sensitive endpoints if Redis is unavailable

## API Input/Output Contracts

- Every endpoint MUST validate request input with Zod
- Every endpoint MUST validate response output with Zod
- “Best-effort” validation FORBIDDEN
- Implicit trust in client input FORBIDDEN
- Mass assignment FORBIDDEN:
  - Explicit DTO allowlist REQUIRED for create/update
- Error messages MUST NOT reveal:
  - resource existence
  - authorization logic
  - internal identifiers

# API DOCUMENTATION (AUTHORITATIVE)

Documentation MUST be treated as a build artifact, NOT a manual task.

## Single Source of Truth

- API Documentation MUST be auto-generated from code/schemas (Zod + OpenAPI generation)
- Manual editing of OpenAPI/Swagger YAML files is FORBIDDEN
- Documentation MUST reflect the exact state of the deployed environment

## Implementation

- OpenAPI v3.0+ REQUIRED
- fastify-swagger REQUIRED
- fastify-swagger-ui:
  - REQUIRED in Development and Staging
  - MUST be disabled by default in Production
- All routes MUST have:
  - Summary / Description
  - Request schema (Zod) when applicable
  - Response schema (Zod) for:
    - 2xx
    - known 4xx
  - Tags for grouping
- 5xx response schema MUST be global and standardized (not per-route)

## Visibility

- /documentation allowed in Development and Staging
- /openapi.json allowed in Development and Staging
- Production default:
  - /documentation DISABLED
  - /openapi.json DISABLED
- Production exception allowed ONLY via Exception Protocol, and MUST include:
  - admin authentication
  - IP allowlist
  - audit logging of access

# DATABASE

- Prisma ONLY
- Manual DB changes FORBIDDEN
- UTC timestamps ONLY
- Currency as integers ONLY
- Soft delete default
- Transactions REQUIRED for multi-aggregate writes

## DB Safety & Scale

- Connection pooling REQUIRED
- Query budgets REQUIRED for hot endpoints
- Index REQUIRED for every query path
- Cursor pagination REQUIRED for high-cardinality lists
- Migration safety REQUIRED (expand/contract only)

## Destructive Operations

- DROP COLUMN / DROP TABLE forbidden in automated migrations if data exists
- Data backfill scripts REQUIRED for new non-nullable columns
- Raw SQL execution FORBIDDEN unless wrapped in a transaction with explicit rollback logic

# BACKGROUND JOBS

Stack: BullMQ + Redis (HA)

- Jobs MUST be idempotent
- Idempotency key REQUIRED:
  jobType:resourceId:inputHash:settingsHash
- Explicit job state machine REQUIRED
- Retry, backoff, timeout REQUIRED
- Dead-letter queue REQUIRED
- CPU-heavy vs IO-heavy queues SEPARATE
- Redis HA REQUIRED

## Correlation

- requestId REQUIRED in job payloads
- jobId MUST be correlated to requestId in logs and traces

## Redis Degradation (Jobs)

- Redis down:
  - Enqueue MUST fail-closed for costful/irreversible work
  - API MUST return 503 (safe failure)
- Silent enqueue failures FORBIDDEN

# CACHING

- Redis REQUIRED (HA)
- TTL REQUIRED for all keys
- Invalidate on mutation REQUIRED
- Cache stampede protection REQUIRED
- User-specific data MUST NOT be cached at CDN

# TOKEN ACCOUNTING (AUTHORITATIVE)

- Ledger is append-only and source of truth
- Ledger MUST NOT be scanned for live balance computation

## Materialized Balances

- Per-bucket materialized balance REQUIRED
- Row-level locking REQUIRED on spend
- Tenant-level aggregate balances WITHOUT bucket granularity FORBIDDEN

## Charging Model

- RESERVE → FINALIZE or RELEASE lifecycle REQUIRED
- Charging without reservation tracking FORBIDDEN

## Idempotency

- Action-level idempotency REQUIRED
- Ledger-level uniqueness REQUIRED
- Multi-row single-key idempotency FORBIDDEN

## Expiry

- Expiry MUST be applied by idempotent background job
- Expiry MUST be recorded in ledger
- Expiry MUST NOT be implemented by deleting rows

# WEBHOOKS

- Signature verification REQUIRED
- Timestamp verification REQUIRED
- Replay protection REQUIRED
- Idempotency REQUIRED
- Webhook payloads MUST NOT be logged (store hash/ids only)
- Webhook processing MUST be resumable and idempotent

# DIAGNOSTICS (MVP SCOPE)

For Generate + Export MVP:

- Static diagnostics ONLY
- No untrusted code execution
- No build or install
- AST-based linting and template validation ONLY

Runtime diagnostics REQUIRE sandbox specification and are out of scope.

# FRONTEND — REACT / NEXT.JS

Stack: react-vite / next.js, typescript, react-query, zustand, react-hook-form, zod, tailwindcss, radix-ui

- Server state: React Query
- Client state: Zustand (slice-based)
- Direct fetch FORBIDDEN
- Error boundaries REQUIRED
- Suspense REQUIRED for lazy loading
- Stable keys REQUIRED
- Max component size: 500 Line of Code (Strict)

## UI / UX (AUTHORITATIVE)

- Mobile-first REQUIRED
- Radix UI ONLY
- Tailwind with semantic CSS variables ONLY
- Prebuilt kits FORBIDDEN unless internal-owned
- Accessibility REQUIRED:
  - minimum 44x44px touch targets
  - keyboard navigation
  - screen reader compatibility
- Placeholders MUST NOT replace labels
- Animations ONLY if UX-justified
- Hover-only interactions FORBIDDEN
- Horizontal scroll on mobile FORBIDDEN unless explicitly justified via Exception Protocol

## USER FEEDBACK (AUTHORITATIVE)

- window.alert / confirm / prompt FORBIDDEN
- Toast notifications FORBIDDEN (all platforms)
- All user-facing messages MUST be inline and contextual

### Inline Message Rules

- Validation errors MUST be field-level (near the control)
- Submit errors MUST be section-level banners (near the form)
- Page-level notices allowed for non-critical info
- Action feedback allowed (e.g., button text changes)

### Message Lifetime Rules

- Error messages MUST persist until resolved or dismissed by user
- Success/info messages MAY auto-dismiss with bounded duration
- Auto-dismiss for errors is FORBIDDEN

### Async Completion Rules

- Background/async completion MUST be discoverable in-app
- Ephemeral-only completion feedback is FORBIDDEN

## DATA FETCHING (REACT QUERY)

- Query keys MUST be stable and deterministic
- initialData shortcuts FORBIDDEN
- Manual refetch hacks FORBIDDEN
- Proper hydration REQUIRED (when SSR/Next)
- Mutations MUST invalidate queries
- Retry MUST be bounded and MUST NOT cause retry storms

## CLIENT STATE (ZUSTAND)

- Slice-based stores REQUIRED
- Cross-slice imports FORBIDDEN (use store composition via explicit interfaces)
- Derived state MUST be computed selectors (no duplicate truth)

## FORMS

- react-hook-form REQUIRED for complex forms
- Zod schema as the source of truth REQUIRED
- Submit handlers MUST be idempotent when possible
- Double-submit protection REQUIRED

## ERROR HANDLING

- Error boundaries REQUIRED for route-level failures
- Global fallback UI MUST be accessible
- User-visible errors MUST not leak internal details
- requestId SHOULD be shown in a copyable UI element for support workflows

## PERFORMANCE (AUTHORITATIVE)

- Avoid layout shift (CLS ≤ 0.1)
- LCP ≤ 2.5s
- Code-splitting REQUIRED for non-critical routes
- Suspense MUST be used for lazy-loaded routes
- Large client bundles MUST be budgeted and tracked in CI

## SEO & I18N (WEB)

- Semantic HTML5
- Single H1 per page
- Proper heading hierarchy
- Meta tags: title, description, og:\* REQUIRED
- i18n: ID + EN, auto-detect, fallback EN
- Translation keys MUST be stable identifiers (not full sentences)

## NEXT.JS SPECIFIC

- RSC caching MUST NOT be relied upon for correctness
- loading.tsx is lifecycle, not UX
- Experimental flags MUST NOT define core behavior

## UI EXCEPTION RULE (ESCAPE HATCH)

UI exceptions allowed ONLY via Exception Protocol and MUST include:

- UX justification
- Accessibility impact assessment
- Isolation and rollback plan

# MOBILE — EXPO

Stack: expo, expo-router, react-native, nativewind v4, zustand, react-query, zod

- Secure storage: Keychain / Keystore ONLY
- AsyncStorage FORBIDDEN for secrets
- Accessibility REQUIRED

## SECURITY (AUTHORITATIVE)

- Tokens MUST be stored ONLY in Keychain/Keystore
- Tokens MUST NOT be logged
- Secrets MUST NOT be bundled in the app
- Certificate pinning OPTIONAL; if used must have rollback plan
- Jailbroken/rooted device trust assumptions FORBIDDEN:
  - treat client as hostile

## UX (AUTHORITATIVE)

- Mobile-first is baseline
- Minimum touch target: 44x44px
- Inline messages ONLY (same as frontend)
- window.alert / confirm / prompt FORBIDDEN
- Toast notifications FORBIDDEN
- Keyboard-safe layouts REQUIRED:
  - inputs MUST remain visible when keyboard opens
- Horizontal scroll FORBIDDEN unless explicitly justified via Exception Protocol
- Loading states MUST be non-blocking and accessible

## USER FEEDBACK (AUTHORITATIVE)

- Validation errors MUST be field-level
- Submit errors MUST be near the action area
- Errors MUST persist until resolved/dismissed
- Success/info MAY auto-dismiss (bounded duration)
- Ephemeral-only completion feedback FORBIDDEN

## NETWORKING & RELIABILITY

- Network timeouts MUST be defined
- Retries MUST be bounded and safe
- Offline/degraded modes MUST be communicated clearly
- Background tasks completion MUST be discoverable in-app (not ephemeral-only)

## DATA & STATE

- Server state: React Query
- Client state: Zustand (slice-based)
- Direct fetch FORBIDDEN
- Mutations MUST invalidate queries
- Sensitive data MUST NOT be stored in plaintext on device

## ACCESSIBILITY

- Screen-reader labels REQUIRED
- Focus order MUST be correct
- Text scaling MUST NOT break critical UI
- Color contrast MUST meet WCAG AA

## BUILD & RELEASE

- Build configuration MUST be reproducible
- Versioning MUST be explicit
- Release artifacts MUST be traceable to git commit hash

# Digitesia Testing Standard — v1.1

(Aligned with Digitesia Engineering Standard v3.6.7)

## PURPOSE (NON-NEGOTIABLE)

Risk-driven, deterministic, long-lived testing system with strict priority:

1. Security & Correctness
2. Reliability
3. Maintainability
4. Performance (as needed)
5. Convenience

This document is LAW. Violations are INVALID.

## CORE PRINCIPLES (ABSOLUTE)

### Determinism

- Tests MUST be deterministic.
- Tests MUST NOT rely on:
  - real time (unless controlled)
  - randomness without explicit seed
  - real network
  - external SaaS
  - flaky UI timing
- Arbitrary sleeps FORBIDDEN. Use readiness signals + bounded timeouts.

### Hermetic Environment

- CI test jobs MUST run with egress default-deny.
- Any unexpected network call MUST fail the run.
- External SaaS calls FORBIDDEN in all test types.
- Testcontainers images MUST be pinned to exact versions (NO latest).

### Snapshot Tests

- Snapshot tests FORBIDDEN (UI/API/anything).

### No Implementation-Detail Testing

- Assert observable behavior + invariants, not internal calls.
- Mocking allowed ONLY at boundaries:
  - network, filesystem, external provider SDKs
- Mocking internal layers (service↔repo↔policy) FORBIDDEN.
- Exception: pure policy engine unit tests MAY mock resource loaders if policy remains pure (no DB/server).

### Schema-First

- Zod schemas are the source of truth for:
  - API request/response
  - DTOs
  - env validation (where applicable)
- Contract tests MUST validate against Zod schemas.

### Security-First Minimum Coverage (MANDATORY)

- Authorization (deny-by-default)
- Tenant isolation (repo layer)
- Job idempotency
- Webhook verification + replay protection (if applicable)
- Token handling (rotation/replay/storage rules)
- Non-leak rule (NotFound masking)

### Time & Clock Control

- Domain logic with time semantics MUST use injected clock.
- Real Date.now() in domain logic FORBIDDEN.
- JWT clock-skew constants MUST be defined and tested.

### Test Data

- Minimal fixtures only.
- Large JSON blobs FORBIDDEN.
- PII/secrets in test data FORBIDDEN.

## SCOPE MODEL (AUTHORITATIVE)

Apply based on project shape:

- Backend-only: Core + Backend + Jobs/Queue + DB + Security + CI gates
- Web-only: Core + Web + Contract + E2E(light) + Client security + CI gates
- Mobile-only: Core + Mobile + Contract + Mobile security + CI gates
- Monorepo: ALL + Monorepo Enforcement

Rule: if multiple scopes apply, strictest wins.

## TEST TAXONOMY (AUTHORITATIVE)

### 1) Unit

Goal: pure logic/invariants.

- Forbidden: DB/HTTP/real FS/external APIs
- Must cover: state machines, idempotency keys, pure authz/policy logic, Zod edge cases

### 2) Integration

Goal: real module boundaries with local infra.
Allowed:

- Postgres (testcontainers)
- Redis (testcontainers)
- in-process Fastify boot
- Prisma migrations on fresh DB
  Must cover:
- tenant scoping on query paths
- transactions for multi-aggregate writes
- cursor pagination where required
- queue config (retry/backoff/timeout/DLQ/correlation)
- safe errors (stable errorCode + requestId, no leaks)

### 3) Contract

Goal: producer/consumer compatibility.
Sources (authoritative order):

1. Shared Zod schema package (preferred)
2. Zod-derived OpenAPI (allowed)
3. Backend-exported Zod schemas (allowed)
   Must cover:

- request/response DTOs
- error shape
- /api/v1 compatibility

#### Contract Compatibility Rules

- Breaking change MUST require API version bump OR explicit compatibility plan (time limit + rollback).
- errorCode stability REQUIRED.
- requestId presence REQUIRED in error responses.
- Additive optional fields allowed.

### 4) E2E (Minimal, Risk-Based)

- Suite MUST be small + stable.
- Snapshot assertions FORBIDDEN.
- Arbitrary sleeps FORBIDDEN.
  Mandatory categories (if applicable):

1. Auth establishment
2. Primary happy path
3. Authz/tenant isolation
4. Idempotent retry
5. Failure recovery
   Optional: billing/quota, webhooks.
   Budgets:

- CI total ≤ 5 minutes
- Per test 10–90 seconds
  Rule: No new E2E unless introducing new critical flow.

### 5) Smoke

- /health
- dependency connectivity (as configured)
- boot sanity

### 6) Regression

- Every production bug fix MUST include regression test (prefer unit/integration).

### 7) Security (Targeted)

As applicable:

- IDOR, mass assignment, SSRF
- webhook replay
- token replay detection
- non-leak masking
- safe errors (no internal ids / no stacks)

### 8) Performance (As Needed)

Nightly/on-demand. Validate:

- p95/p99 latency
- backpressure/load shedding
- bounded retries
- worker concurrency caps
- queue depth recovery

## BACKEND TEST RULES (Fastify/Prisma/Postgres)

- Integration tests MUST boot real Fastify app:
  - global error handler
  - requestId injection
  - auth hooks enabled
- Test-only auth bypass FORBIDDEN for integration/E2E.
- Allowed setup: seed users/sessions tenant-scoped OR execute login flow.
- Fresh DB per run; migrations applied; UTC only.
- Multi-tenancy tests MUST include same-tenant success + cross-tenant denial.
- Error tests MUST assert stable errorCode + safe message + status + requestId.

## JOBS / QUEUES / REDIS TEST RULES

- Idempotency MUST be tested:
  - same key → no duplicate effects
  - retries do not duplicate artifacts
  - changed input/settings → new job
- State machine transitions MUST be tested (valid/invalid, timeout→fail, DLQ).
- Correlation propagation MUST be tested (requestId→jobId).
- Queue separation + worker concurrency limits MUST be tested (CPU-heavy isolation).
- Redis degradation behavior MUST be tested (fail-closed where required; no silent enqueue failures).

## WEB (REACT) TEST RULES

Allowed:

- unit (utils/selectors)
- component (minimal observable behavior)
- integration (routing + React Query + contract-mocked API)
- E2E (critical flows only)
  Forbidden:
- snapshots
- hook internal testing
- direct fetch usage
  Must cover:
- error boundaries
- query invalidation after mutations
- auth transitions
- inline messaging behavior (no toast/alert patterns enforced by app rules)

## MOBILE (EXPO) TEST RULES

Must cover:

- secure storage usage (Keychain/Keystore)
- auth persistence rules
- contract decoding/schema validation
- smoke navigation flows
- inline messaging behavior (no toast/alert)
  Mobile E2E:
- optional unless core revenue surface; if used ≤ 3–5 flows.

## MONOREPO ENFORCEMENT (AUTHORITATIVE)

- Shared Zod schema package REQUIRED; backend/web/mobile MUST consume it.
- Contract tests verify producer + consumers.
  Ownership:
- unit/integration owned by feature module
- contract co-owned producer+consumers
- E2E owned by surface (web/mobile)
- shared packages MUST NOT contain E2E
  CI per package:
- pnpm -r lint
- pnpm -r typecheck
- pnpm -r test
  E2E separate stage.

## RULE — TEST CO-CHANGE (AUTHORITATIVE)

- Any change to production code MUST include corresponding tests in the same PR.
- Tests MUST pass in CI; failing tests invalidate the PR.
- For every new feature or bug fix:
  - Unit tests MUST be added/updated immediately after the implementation is completed.
  - Negative tests REQUIRED for high-risk paths.
- High-risk domains MUST always have tests:
  - authorization policies (deny-by-default)
  - tenant isolation (repository layer)
  - job idempotency
  - webhook verification + replay protection (if applicable)
  - token rotation + replay detection
- PR is INVALID if production logic changes without tests.

## CI TEST GATES (AUTHORITATIVE)

Required on every PR:

1. lint
2. typecheck
3. unit
4. integration
5. contract
6. secret + dependency scans

E2E scheduling:

- smoke E2E allowed on PR
- full E2E on merge-to-main and nightly

## FLAKINESS & QUARANTINE (ABSOLUTE)

- Test retries FORBIDDEN by default.
- Flaky tests MUST be quarantined in a single file (e.g., test-quarantine.md) with:
  - test id/name, owner, issue reference, expiry date
- After expiry date: CI MUST fail until fixed or removed via Exception Protocol.
- Quarantine MUST NOT hide regressions.

## COVERAGE POLICY (RISK-BASED)

Percent targets are NOT authoritative.
Minimum high-risk coverage is mandatory:

- authz, tenancy, idempotency, webhooks (if any), token safety, error safety, backpressure/timeouts (as applicable).

## FAIL-FAST CONDITIONS (ABSOLUTE)

STOP immediately if unclear:

- project shape (backend/web/mobile/monorepo)
- jobs/queues presence
- multi-tenancy requirements
- billing/webhooks usage
- CPU-heavy workloads needing queue separation
- CI hermetic constraints (egress + pinned containers)
