---
description: Debug and fix a bug with root cause analysis and regression testing.
---

# /fix-bug

## Prerequisites

1. Read `PROJECT.yaml` at project root
2. Follow ALL rules in `active_modules`
3. Meet ALL `quality_gates` before delivering

## Steps

1. Receive bug description from developer
2. Read `PROJECT.yaml` + relevant codebase
3. Analyze root cause:
   - Identify involved files and functions
   - Trace data flow to find the source of the problem
   - Explain WHY the bug occurs (not just where)
4. Propose fix:
   - Explain what changes will be made
   - Explain potential impact on other parts
5. Ask developer to **approve** approach
6. Implement fix:
   - Fix the bug
   - Follow coding standards in rules
7. Write regression test:
   - Test that FAILS before the fix
   - Test that PASSES after the fix
   - Ensure this test prevents the bug from recurring
// turbo
8. Run verification: `pnpm biome check .` + `pnpm tsc --noEmit` + `pnpm test`
9. Display summary: root cause → fix → test

## Rules

- MUST explain root cause before fixing
- MUST write regression test
- MUST NOT fix without understanding why the bug occurs

## Next Steps

After bug is fixed:

- → `/test` to verify regression test passes
