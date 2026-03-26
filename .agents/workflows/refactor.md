---
description: Refactor code area following rules without changing behavior.
---

# /refactor

## Prerequisites

1. Read `PROJECT.yaml` at project root
2. Follow ALL rules in `active_modules`
3. Meet ALL `quality_gates` before delivering

## Steps

1. Receive area/file to refactor from developer
2. Read `PROJECT.yaml` + relevant rules
3. Analyze code area:
   - Identify code smells and violations
   - Check compliance against active rules
   - Check file size limits (backend 400 LOC, frontend 500 LOC)
4. Propose refactor plan:
   - List all changes to be made
   - Explain reason for each change (reference which rule)
   - Ensure behavior does NOT change
5. Ask developer to **approve** plan
6. Implement refactor:
   - Follow architecture patterns in rules
   - Follow naming conventions
   - Split files if exceeding LOC limits
7. Verify:
   - All existing tests MUST still pass
   - No behavior change allowed without approval
// turbo
8. Run: `pnpm biome check .` + `pnpm tsc --noEmit` + `pnpm test`

## Rules

- MUST reference the violated rule when proposing refactor
- MUST NOT change behavior without approval
- MUST NOT refactor without plan approval
- All existing tests MUST still pass after refactor

## Next Steps

After refactor is complete:

- → `/test` to verify no regressions
- → `/review` to check overall quality
