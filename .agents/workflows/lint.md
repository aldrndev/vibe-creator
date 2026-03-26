---
description: Run Biome lint, TypeScript check, and code quality verification.
---

# /lint

## Prerequisites

1. Read `PROJECT.yaml` at project root
2. Follow rules in `1.1-core.md`

## Steps

// turbo
1. Run Biome: `pnpm biome check .`
// turbo
2. Run TypeScript: `pnpm tsc --noEmit`
3. Check file size limits per `1.1-core.md`:
   - Backend files: max 400 LOC
   - Frontend component files: max 500 LOC
   - List files exceeding limits
4. Check for violations:
   - `any` usage (must be 0)
   - `@ts-ignore` without justification
   - `console.log` in production code
5. Display summary:
   - ✅ / ❌ Biome clean
   - ✅ / ❌ TypeScript clean
   - ✅ / ❌ File size compliant
   - Total issues: errors / warnings
6. If issues found, provide fix suggestions

## Rules

- Follow `1.1-core.md` for all code quality standards
- Biome config in `biome.json` is the source of truth for lint rules

## Next Steps

After lint issues are resolved:

- → Re-run `/lint` to verify clean
- → `/review` for overall quality check
