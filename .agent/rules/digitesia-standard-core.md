---
trigger: always_on
---

# Digitesia Engineering Standard — v3.6.7 (CORE)

## PURPOSE (NON-NEGOTIABLE)

Override human/AI defaults: speed/shortcuts/happy-path.

Priority order (strict):

1. Security
2. Correctness
3. Reliability
4. Maintainability
5. Performance
6. Convenience

Tradeoffs that violate this order are FORBIDDEN.

## OUTPUT CONTRACT (ABSOLUTE)

- OUTPUT ONLY: .ts .tsx .json .yaml .sql .md
- NO explanations/chat/emojis
- PRODUCTION-READY
- If unclear → FAIL FAST:
  // TODO: requirements unclear

## AI COMPLIANCE GATE (ABSOLUTE)

AI MUST:

- Treat this doc as hard constraints
- Prefer explicit, boring, reversible designs
- Reject shortcuts even if they work
- STOP when requirements are incomplete

AI MUST NOT:

- Guess intent
- Fill gaps with assumptions
- Optimize for speed/brevity

## CONTEXT PRIORITY RULE (ABSOLUTE)

When context is limited, read in this order:

1. Types/Schemas
2. Config/Env
3. Services
4. Controllers/UI

## CODE QUALITY (ABSOLUTE)

### ESLint

- no-console: warn
- @typescript-eslint/no-explicit-any: error
- @typescript-eslint/no-deprecated: error
- @typescript-eslint/no-unused-vars: warn (argsIgnorePattern: ^\_)

### Type Safety

- any FORBIDDEN
- unknown ONLY with explicit narrowing
- Deprecated APIs FORBIDDEN

### Self-Documenting Code

- TSDoc/JSDoc REQUIRED for all exported APIs
- Comments explain WHY, not WHAT
- Magic numbers FORBIDDEN (named constants + rationale)

### File Size Limits

- Backend files: MAX 400 LOC
- Frontend components: MAX 500 LOC

## DEPENDENCY & SUPPLY CHAIN (ABSOLUTE)

- Exact versions only; latest/^/~/\* FORBIDDEN
- Lockfile REQUIRED + committed
- Node & pnpm versions pinned
- CI MUST fail on critical vulnerabilities
- SBOM REQUIRED for release artifacts
- Deprecated deps FORBIDDEN
- Unmaintained deps FORBIDDEN unless Exception Protocol
- Unverified/transitive-only deps FORBIDDEN

### Dependency Install (AUTHORITATIVE)

- `pnpm add <pkg>@<exact-version>` REQUIRED
- `pnpm add -D <pkg>@<exact-version>` REQUIRED
- No-version install FORBIDDEN:
  - pnpm add <pkg>
  - pnpm add <pkg>@latest
- package.json MUST contain exact versions only
- pnpm-lock.yaml MUST be committed in the same PR

### Audit & Outdated (AUTHORITATIVE)

- CI MUST run `pnpm audit` (or equivalent)
- CI MUST fail on critical vulnerabilities unless Exception Protocol
- Fixes MUST be pinned upgrades only (`pnpm add <pkg>@X.Y.Z`)
- `pnpm outdated` MUST be reviewed on a repo-defined cadence
- Major upgrades MUST be isolated PRs with migration notes + tests

### Transitive Vulnerability Overrides (AUTHORITATIVE)

- pnpm.overrides allowed ONLY for security remediation
- MUST pin exact version
- MUST have ADR with expiry date
- MUST be removed when upstream fix is available

## VALIDATION (ABSOLUTE)

Zod REQUIRED for:

- API input/output
- Environment variables
- DTOs (schema-first)

Implicit trust in client data FORBIDDEN.

## NAMING & MODULE BOUNDARIES (ABSOLUTE)

- Files/dirs: kebab-case
- Vars/functions: camelCase
- Env vars: UPPER_SNAKE_CASE
- Path aliases REQUIRED: @/ and @pkg/\*
- ../../ relative imports FORBIDDEN

### Feature Boundary Rule (AUTHORITATIVE)

- One feature = one domain module
- Cross-feature imports FORBIDDEN
- Shared logic ONLY in explicit shared packages
- Feature access ONLY via public barrel exports
- Boundary enforcement REQUIRED (ESLint + TS references)

## CONTINUOUS INTEGRATION (AUTHORITATIVE)

CI MUST run on every push & PR:

- lint
- typecheck
- build
- tests REQUIRED
- dependency & secret scan

Merge to main/master FORBIDDEN if CI fails.

### Dependency Drift Gate (AUTHORITATIVE)

- CI MUST fail if package.json contains ^ or ~ or \* or latest
- CI MUST fail if lockfile missing or not updated when deps change

## RULE — TEST CO-CHANGE (AUTHORITATIVE)

- Production code changes MUST include corresponding tests in the same PR
- Negative tests REQUIRED for high-risk paths
- High-risk domains MUST have tests:
  - authorization (deny-by-default)
  - tenant isolation (repo layer)
  - job idempotency
  - webhook verification + replay protection (if applicable)
  - token rotation + replay detection

PR is INVALID if production logic changes without tests.

### Commit Convention (AUTHORITATIVE)

- Conventional Commits REQUIRED: feat, fix, chore, docs, refactor, perf, test, ci
- Breaking changes explicitly marked in footer
- Imperative mood REQUIRED

## GIT WORKFLOW (TRUNK-BASED) (AUTHORITATIVE)

- Short-lived feature branches REQUIRED (deleted after merge)
- Long-lived dev/staging branches FORBIDDEN
- Rebase preferred for feature branches
- main/master history rewrite FORBIDDEN
- Branch naming: type/short-description (feat|fix|chore|refactor|docs|perf|test|ci)

## DOCUMENTATION ENTRYPOINT (README) (ABSOLUTE)

Root README.md MUST include:

1. Prerequisites (exact Node/Docker versions)
2. Quick Start (local commands)
3. Environment (example env + meaning)
4. Architecture (Mermaid/ASCII)
5. Commands table (build/test/db:migrate/lint/typecheck)

External wiki as “Getting Started” FORBIDDEN.

## OBSERVABILITY (ABSOLUTE)

### Logging

- Structured logging REQUIRED
- Global error handler REQUIRED
- requestId REQUIRED
- Correlation REQUIRED: requestId → jobId
- Required fields: service, env, version, requestId, jobId, tenantId, userId (pseudonymous), route, latencyMs
- Redaction REQUIRED: secrets/tokens/credentials/full PII; webhook payloads (store hash/ids only)

### Tracing

- OpenTelemetry REQUIRED
- Head-based sampling REQUIRED
- High-cardinality attributes FORBIDDEN
- Large payloads in logs/traces FORBIDDEN

### Metrics & Alerts

Metrics REQUIRED: latency p95/p99, error rate, queue depth, job duration p95/p99, worker CPU/RAM, disk
Alerts REQUIRED: queue stuck, failure spike, disk below threshold, redis memory high

## SECURITY (ABSOLUTE)

- Secrets NEVER committed
- .env.example REQUIRED
- Token-based auth ONLY
- Tokens NOT in localStorage
- CSRF REQUIRED for cookie auth
- Admin MFA REQUIRED
- Step-up auth REQUIRED for sensitive actions

### Token Storage

- Web: HttpOnly + Secure + SameSite cookies
- Mobile: Keychain/Keystore ONLY

## AUTHENTICATION — HYBRID TOKEN MODEL (AUTHORITATIVE)

### Access Token

- Stateless JWT signed using jose
- Short-lived (MAX 15m)
- Mandatory claims: iss, aud, sub, tid, iat, exp, nbf
- Algorithm allowlist REQUIRED; alg=none FORBIDDEN
- kid REQUIRED
- Clock skew tolerance MUST be explicitly defined
- Payload minimal (no PII)

### JWT Key Management

- Key ring REQUIRED (1 active signing key; multi-verify allowed)
- Rotation MUST NOT log out active users
- Emergency revocation procedure REQUIRED
- Hardcoded keys FORBIDDEN

### Refresh Token

- Opaque reference token ONLY (min 32 bytes random)
- Stored ONLY as hash in DB
- Never logged
- JWT refresh tokens FORBIDDEN

### Refresh Rotation & Replay Detection

- Rotate on EVERY refresh; single-use tokens
- Token family model REQUIRED
- Reuse of rotated token MUST revoke entire family

## AUTHORIZATION & TENANCY (ABSOLUTE)

- Zero-trust: attacker may be authenticated
- Server-side authorization on EVERY request
- Central policy model REQUIRED (deny-by-default)
- Tenant isolation REQUIRED: tenantId enforced at repository layer; unscoped queries FORBIDDEN
- IDOR protection REQUIRED
- Sequential/guessable IDs FORBIDDEN (UUID/opaque)

### Non-Leak Rule

- Unauthorized access returns generic NotFound
- Resource existence MUST NOT be inferable
- Denied attempts audited

## SECURITY HARDENING (AUTHORITATIVE)

- Mass assignment FORBIDDEN (explicit allowlist REQUIRED)
- Errors MUST NOT reveal: existence/authz logic/internal identifiers

### Network & Headers

- SSRF protection REQUIRED (allowlists, private IP block, DNS rebinding defense)
- Egress default-deny REQUIRED
- Security headers REQUIRED:
  - CSP (frame-ancestors), X-Content-Type-Options
  - Referrer-Policy, Permissions-Policy

### Webhooks

- Signature + timestamp verification REQUIRED
- Replay protection REQUIRED
- Idempotency REQUIRED

## AUDIT LOGGING (ABSOLUTE)

- Immutable append-only sink REQUIRED
- App role MUST NOT have update/delete permission
- Tamper detection REQUIRED
- Events: auth, admin, payments, role changes, exports, deletes
- Correlation via requestId/jobId REQUIRED

## ENVIRONMENT VARIABLES & CONFIGURATION (AUTHORITATIVE)

- NODE_ENV MUST be: development | staging | production; default FORBIDDEN
- Env MUST be Zod-validated at startup; missing required env MUST fail fast
- Silent secret fallbacks FORBIDDEN
- Secrets: no defaults; not baked into images; not logged; not in client bundles

### Monorepo .env

- Root .env allowed ONLY for shared infra + compose-level NON-secret vars (local dev)
- Root .env MUST NOT contain app secrets
- App-scoped env REQUIRED:
  - apps/api/.env
  - apps/worker/.env
  - apps/web/.env (public-only)

### Dotenv Loading

- Shared packages MUST NOT load dotenv
- packages/config MUST NOT read files/load dotenv
- Only app entrypoints MAY load dotenv for local dev
- Production MUST inject env via orchestrator

### Client Env Vars

- Web MUST use explicit public prefix (e.g., VITE*PUBLIC*)
- Non-public vars MUST NOT be accessible in client build
- Vars without public prefix treated secret-by-default

## DOCKER (AUTHORITATIVE)

- Multi-stage builds REQUIRED
- Non-root containers REQUIRED
- Pinned image versions (NO latest)
- Health checks REQUIRED
- .env MUST NOT be baked into images
- Build ARG MUST NOT contain secrets
- Runtime secrets injected at container start

### docker-compose

- Allowed for local dev and CI
- Production orchestrator FORBIDDEN unless Exception Protocol
- Compose MUST NOT contain secrets
- App services MUST use app-scoped env_file (no root secrets)
- Non-secret defaults (${VAR:-default}) allowed; secret defaults FORBIDDEN; missing secrets MUST fail startup

## CONTINUOUS DELIVERY (AUTHORITATIVE)

- Deployments automated from main/master only; blocked if CI not green
- Immutable artifacts REQUIRED: Docker image tagged with git SHA; mutable tags FORBIDDEN
- Pipeline MUST: verify digest → deploy → healthcheck gate (bounded) → auto rollback on failure
- Deploy audit record REQUIRED: git SHA, operator, timestamp, environment

## SUPPLY-CHAIN DEPLOY GATE (AUTHORITATIVE)

- Artifact digest MUST be verified; mismatch fails deploy
- Critical vuln scan fails deploy unless Exception Protocol
- SBOM REQUIRED for every release artifact

## RELEASE ARTIFACTS (AUTHORITATIVE)

- Every release MUST produce: pinned Docker image (git SHA) + SBOM
- Secrets MUST NOT be baked into images
- Runtime config injected at container start

## MONOREPO (IF APPLICABLE) (AUTHORITATIVE)

- pnpm workspaces REQUIRED
- Root scripts MUST be consistent org-wide (see Blueprint Rules)

## TESTING (AUTHORITATIVE)

- Deterministic tests ONLY; snapshot FORBIDDEN
- Negative tests REQUIRED
- Minimum high-risk coverage:
  - authorization policies
  - tenant isolation
  - job idempotency
  - webhook verification
  - token spend concurrency

## HA / DR / SLO (PRODUCTION) (AUTHORITATIVE)

- SLOs REQUIRED
- Multi-instance, multi-AZ REQUIRED
- Backups + restore drills REQUIRED
- Canary deploy + automated rollback REQUIRED
- Single-node VPS MUST record “no multi-AZ” + migration plan

## DEPLOYMENT SAFETY (AUTHORITATIVE)

- Zero-downtime deploy PREFERRED (blue/green or rolling)
- Health checks MUST gate traffic
- Rollback MUST be single-command and periodically tested

## CHANGE SAFETY RULE (ABSOLUTE)

Hard-to-rollback, bug-hiding, undocumented-behavior reliance is FORBIDDEN.

## FORBIDDEN SHORTCUTS (ABSOLUTE)

- any for speed
- console.log
- DB access in controllers
- !important
- @ts-ignore without documented reason
- Hardcoded URLs or secrets
- Shared packages loading dotenv
- Root .env containing app secrets
- Secret defaults in docker-compose

## EXCEPTION PROTOCOL (ABSOLUTE)

Rule violations ONLY with:

- Written justification
- Scoped impact
- Time limit
- Rollback plan
- Explicit approver
- Temporary pnpm.overrides allowed ONLY for transitive vulnerability remediation; MUST include expiry date + removal plan
