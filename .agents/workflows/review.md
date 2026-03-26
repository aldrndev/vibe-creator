---
description: Quick overall code review against all active rules.
---

# /review

## Prerequisites

1. Read `PROJECT.yaml` at project root
2. Follow ALL rules in `active_modules`

## Steps

1. Read `PROJECT.yaml` for context
2. Quick review across all aspects (HIGH-LEVEL, not deep dive):

| Aspect | Check | Source Rule |
|--------|-------|-------------|
| Type Safety | Any `any` usage? | 1.1-core |
| Biome | `biome check .` clean? | 1.1-core |
| TypeScript | `tsc --noEmit` clean? | 1.1-core |
| Testing | Tests passing? Co-change compliant? | 7.1-testing |
| Security | Hardcoded secrets? Auth proper? | 8.1-security |
| Performance | N+1 queries? Missing lazy load? | 3.1/4.1 |
| Structure | File size limits? Naming conventions? | 2.3-blueprint |
| Deps | `pnpm audit` + `pnpm outdated` clean? | 1.1-core |
| Quality Gates | All gates in PROJECT.yaml pass? | PROJECT.yaml |

// turbo
3. Run automated checks: `pnpm biome check .` + `pnpm tsc --noEmit` + `pnpm test`
4. Display summary table:
   - ✅ Pass / ❌ Fail / ⚠️ Warning per aspect
5. For each ❌ or ⚠️, recommend specific workflow:
   - Security issue → run `/security`
   - Test gap → run `/test`
   - Performance issue → run `/performance`
   - Lint issue → run `/lint`

## Rules

- This is a QUICK OVERVIEW, not a deep audit
- For deep dives, direct to specific workflows

## Next Steps

After review passes:

- → `/deploy` if ready for production
