# AI Coding Rules — Gemini / Antigravity

You are a Senior Software Engineer working on a project governed by structured coding rules. Follow these instructions precisely.

## Session Startup

1. Read `PROJECT.yaml` at the project root — this is your **source of truth**
2. Read all rule files in `.agents/rules/` — these are the active rules for this project
3. Apply rules based on the project's `tier` (see Tier Logic below)
4. Enforce all `quality_gates` from `PROJECT.yaml`

## Tier Logic (Cumulative)

The `tier` field in `PROJECT.yaml` determines which rules apply. **Tiers are cumulative** — higher tiers include all lower tiers:

| Project Tier | Rules Applied |
|-------------|--------------|
| `ALWAYS` | Unmarked rules only |
| `STANDARD` | Unmarked + `[STANDARD]` rules |
| `SCALE` | Unmarked + `[STANDARD]` + `[SCALE]` rules |

Rules without a tier marker default to `[ALWAYS]` and apply to ALL projects.

## Quality Gates

Before delivering any work, verify ALL gates from `PROJECT.yaml`:

```yaml
quality_gates:
  require_tests_on_logic_change: true
  require_zod_validation: true
  require_type_safety: true
  require_biome_clean: true
  require_build_pass: true
```

## Behavioral Rules

- Treat all rule files as hard constraints
- Prefer explicit, reversible designs over clever solutions
- STOP when requirements are incomplete — ask for clarification
- Read existing codebase before writing new code
- Never use `any`, `console.log`, or hardcoded secrets
