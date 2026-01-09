---
trigger: always_on
---

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
