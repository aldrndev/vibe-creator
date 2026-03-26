---
description: Add a new feature following project rules and planning flow.
---

# /add-feature

## Prerequisites

1. Read `PROJECT.yaml` at project root
2. Follow ALL rules in `active_modules`
3. Meet ALL `quality_gates` before delivering

## Steps

1. Receive feature description from developer
2. Read `PROJECT.yaml` for context (profile, tier, existing features)
3. Create mini-PRD per `2.1-planning.md`:
   - Requirements
   - Acceptance criteria
   - Scope (what is included and what is NOT)
   - UI/UX direction (if feature has UI — color, layout, component patterns per `2.2-design.md`)
   - Estimated files to create/modify
4. Ask developer to **approve** PRD
5. Implement feature:
   - Create/update types and Zod schemas FIRST
   - Create/update components, services, API endpoints
   - Follow architecture pattern in rules (Controller → Service → Repository)
   - Follow naming conventions and file structure from `2.3-blueprint.md`
// turbo
6. Write tests per `7.1-testing.md`:
   - Unit tests for new logic
   - Integration tests for new API endpoints
   - Test co-change rule: every logic change MUST have a corresponding test change
7. Update `PROJECT.yaml` features list (add the new feature)
// turbo
8. Run verification: `pnpm biome check .` + `pnpm tsc --noEmit` + `pnpm test`
9. Display change summary

## Rules

- MUST NOT skip planning step
- MUST NOT implement without PRD approval
- MUST write tests for every new logic
- Use `@latest` when installing new packages — refer to active rule files for the standard stack
- For complex features with significant UI → suggest `/planning` first

## Next Steps

After feature is implemented:

- → `/test` to run tests and check co-change compliance
- → `/review` to verify overall quality
