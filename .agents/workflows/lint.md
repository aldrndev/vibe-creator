---
description: Run Biome lint, TypeScript check, and code quality verification.
---

# /lint

## Prerequisites

1. Read `PROJECT.yaml` at project root
2. Follow rules in `1.1-core.md`

## Steps

1. Run Biome: `pnpm biome check . --diagnostic-level=warn`
2. Check Biome output:
   - If ANY errors → fix immediately
   - If ANY warnings → fix before marking as clean
   - "Biome clean" = **0 errors AND 0 warnings**
3. Run TypeScript: `pnpm tsc --noEmit`
4. Check file size limits per `1.1-core.md`:
   - Backend files: max 400 LOC
   - Frontend component files: max 500 LOC
   - List files exceeding limits
5. Check for violations:
   - `any` usage (must be 0)
   - `@ts-ignore` without justification
   - `console.log` in production code
   - Nested ternary operators (must be 0)
   - Cognitive complexity > 15 (must be 0)
6. Display summary:
   - ✅ / ❌ Biome clean (0 errors + 0 warnings)
   - ✅ / ❌ TypeScript clean
   - ✅ / ❌ File size compliant
   - Total issues: X errors / Y warnings
   - ⚠️ Warnings count toward "not clean" — must be 0
7. If issues found:
   - Fix all errors first
   - Then fix all warnings
   - Re-run until fully clean

## Rules

- Follow `1.1-core.md` for all code quality standards
- Biome config in `biome.json` is the source of truth for lint rules
- "Biome clean" = 0 errors + 0 warnings (see `1.1-core.md` Biome Clean Definition)

## Next Steps

After lint issues are resolved:

- → Re-run `/lint` to verify clean
- → `/review` for overall quality check
