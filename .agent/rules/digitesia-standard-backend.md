---
trigger: always_on
---

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
