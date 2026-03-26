---
description: Apply the AI rules system to an existing project without restructuring it.
---

# /adopt

## Prerequisites

1. Working directory is an EXISTING project with source code
2. Working directory MUST already have `.agents/workflows/` pre-populated by the developer

## Rules Source
// turbo
All rule files and configs are sourced from: `/Users/aldrnmrsd/Documents/Coding/Rules/`

## Profile → Active Modules

| Profile | Description | active_modules |
|---------|-------------|----------------|
| **F** | Frontend Only | 1.1, 1.2, 2.1, 2.2, 2.3, 3.1, 7.1, 8.1, 9.1 |
| **B** | Backend Only | 1.1, 1.2, 2.1, 2.3, 4.1, 7.1, 8.1, 9.1 |
| **M** | Mobile Only | 1.1, 1.2, 2.1, 2.2, 2.3, 5.1, 7.1, 8.1, 9.1 |
| **FB** | Fullstack (Monolith) | 1.1, 1.2, 2.1, 2.2, 2.3, 3.1, 7.1, 8.1, 9.1 |
| **FB** | Fullstack (Monorepo) | 1.1, 1.2, 2.1, 2.2, 2.3, 3.1, 4.1, 6.1, 7.1, 8.1, 9.1 |
| **FBM** | Fullstack + Mobile | ALL (1.1 through 9.1) |
| **MB** | Mobile + Backend | 1.1, 1.2, 2.1, 2.2, 2.3, 4.1, 5.1, 6.1, 7.1, 8.1, 9.1 |
| **SF** | Frontend + Supabase | 1.1, 1.2, 2.1, 2.2, 2.3, 3.1, 4.2, 7.1, 8.1, 9.1 |
| **SM** | Mobile + Supabase | 1.1, 1.2, 2.1, 2.2, 2.3, 4.2, 5.1, 7.1, 8.1, 9.1 |

## Tier Logic (Cumulative)

**Tiers are cumulative** — higher tiers include all lower tiers:

| Project Tier | Rules Applied | When to Use |
|-------------|--------------|-------------|
| `ALWAYS` | Unmarked rules only | Small / personal / MVP projects |
| `STANDARD` | Unmarked + `[STANDARD]` | Mid-size / paid client projects |
| `SCALE` | Unmarked + `[STANDARD]` + `[SCALE]` | Large / production-critical / high-traffic |

## Steps

1. **Scan existing project** — read `package.json` and project files to detect:
   - Installed packages and dependencies
   - Package manager (`pnpm-lock.yaml`, `package-lock.json`, `yarn.lock`)
   - Existing folder structure
   - Existing configs (`tsconfig.json`, `biome.json`, `.eslintrc`, `.prettierrc`)
   - Existing `.env` / `.env.example`
   - **Compare existing packages against active rule files** (`3.1-frontend.md`, `4.1-backend.md`, `4.2-supabase.md`, `5.1-mobile.md`):
     - If project uses alternative with same purpose (e.g. axios vs ky) → flag for switching to the standard
     - If required package for the profile is MISSING → flag for adding
2. **Recommend** based on detection:
   - Profile (F | B | FB | M | MB | FBM | SF | SM)
   - Architecture (monolith | monorepo) — matters especially for FB (monolith vs monorepo)
   - Tier (ALWAYS | STANDARD | SCALE)
   - Deploy target (if detectable from existing config)
3. Present detection results + package comparison + recommendations, ask developer to **approve/modify**
4. Once approved, generate `PROJECT.yaml` at project root using template from `<rules-source>/configs/PROJECT.yaml`
   - Fill all fields based on approved recommendations + detected state
   - `active_modules` auto-filled based on profile per mapping above
   - `features` filled based on existing code analysis
   - `deploy` filled per existing deploy configuration (if found)
5. Ask developer to **review & approve** PROJECT.yaml
6. Once YAML is approved:
// turbo
   - Copy active rule modules from `<rules-source>/agents/rules/` → `.agents/rules/` (only modules listed in `active_modules`)
// turbo
   - Copy `<rules-source>/GEMINI.md` → project root
// turbo
   - Copy `<rules-source>/AGENTS.md` → project root
7. **Handle existing configs** (ask before each):
   - If project has NO `biome.json`: copy from `<rules-source>/configs/biome.json`
   - If project HAS `biome.json`: ask to **merge** (add missing rules from template while keeping existing)
   - If project has `.eslintrc` or `.prettierrc`: ask to **replace with Biome** or keep existing
   - If project has `tsconfig.json`: **merge** `compilerOptions` from `<rules-source>/configs/tsconfig.base.json`:
     - Add/Overwrite all options defined in the template
     - Do NOT overwrite existing framework-specific options (`module`, `target`, `paths`, etc.) that are absent from the template
   - If project has NO `tsconfig.json`: ask developer which framework to use, then generate appropriate `tsconfig.json` with strict options merged
8. Apply approved package changes:
   - Upgrade packages to `@latest`, add missing, swap alternatives
   - Run `pnpm install`
   - Run `pnpm audit` — fix any vulnerabilities found
   - Run `pnpm outdated` — verify all packages are up to date
9. Display setup summary
10. Recommend developer to run `/review` to check compliance against active rules

## Rules

- This workflow is **non-destructive** — never overwrite existing files without asking
- Never auto-restructure folders — report differences and let developer decide
- Never auto-fix code — report issues and let developer decide
- Existing `.env` files are NEVER touched — only create `.env.example` if missing
- When merging configs, ADD missing options from template but KEEP existing settings
- Package changes MUST be approved before applying
- When upgrading to `@latest`, flag breaking changes found in changelogs before applying

## Next Steps

After adoption is complete:

- → `/review` to check overall compliance against active rules