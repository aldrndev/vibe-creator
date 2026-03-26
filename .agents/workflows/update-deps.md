---
description: Update project dependencies to latest stable versions with safety checks.
---

# /update-deps

## Prerequisites

1. Read `PROJECT.yaml` at project root

## Steps

// turbo
1. Read `PROJECT.yaml` for profile and current packages
// turbo
2. Run `pnpm outdated` — get list of outdated packages with current + latest versions
// turbo
3. Run `pnpm audit` — identify vulnerabilities
4. For each outdated or vulnerable package, **search the web** for:
   - Changelog / release notes for breaking changes
   - Migration steps (if major version bump)
5. Present combined report:

   | Package | Current | Latest | Breaking? | Vuln? | Migration Notes |
   |---------|---------|--------|-----------|-------|--------------------|
   | ... | ... | ... | Yes/No | Yes/No | ... |

6. Ask developer to **approve** updates (approve all or select per package)
7. Once approved:
   - Update `package.json`
// turbo
   - Run `pnpm install`
// turbo
   - Run `pnpm test` — verify no breakage
// turbo
   - Run `pnpm biome check .` + `pnpm tsc --noEmit`
8. If tests fail after update:
   - Identify the package causing the failure
   - Propose migration fix and apply
   - If fix is not possible within reasonable effort, document the issue and pin to previous version

## Rules

- AI MUST search the web for changelogs — MUST NOT guess breaking changes
- MUST NOT update without developer approval
- MUST run full test suite after updating
- Breaking changes MUST be identified and highlighted BEFORE updating
- Prefer fixing forward over rolling back
- If fix is not possible within reasonable effort, document the issue and pin to previous version

## Next Steps

After dependencies are updated:

- → `/test` to verify no regressions
- → `/review` for overall quality check
