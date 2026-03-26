---
description: Run tests, check coverage, and verify test co-change compliance.
---

# /test

## Prerequisites

1. Read `PROJECT.yaml` at project root
2. Follow rules in `7.1-testing.md`

## Steps

// turbo
1. Run test suite: `pnpm test`
2. Report results:
   - Total tests: pass / fail / skip
   - Coverage summary per module
3. Check test scope per profile (see `7.1-testing.md` § Scope Model):
   - Verify project has the REQUIRED test types for its profile
   - Report MISSING test types (e.g., Profile B missing integration tests at [STANDARD] tier)
4. Check co-change compliance (from `7.1-testing.md`):
   - Find logic files changed since last commit
   - Verify each logic file has a corresponding test
   - Report files WITHOUT tests
5. Identify critical untested paths:
   - Auth flows
   - Payment/transaction logic
   - Data mutation endpoints
6. Suggest missing tests if gaps exist
7. Display summary table:
   - ✅ / ❌ Tests passing
   - ✅ / ❌ Co-change compliant
   - ✅ / ❌ Critical paths tested
   - Coverage percentage

## Rules

- Follow `7.1-testing.md` for all standards
- Tests MUST be deterministic (no real-time deps, no random)
- Tests MUST be hermetic (isolated, idempotent)
- Mock ONLY at boundaries (external APIs, DB)

## Next Steps

After all tests pass:

- → `/review` for overall quality check
