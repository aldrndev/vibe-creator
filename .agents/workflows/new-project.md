---
description: Initialize a new project from description. AI recommends profile, tier, and setup.
---

# /new-project

## Prerequisites

1. Working directory MUST already have `.agents/workflows/` pre-populated by the developer

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

1. Receive project description from developer
2. **Check for PRD** — does `docs/prd.md` exist?
   - If YES → read it for context, proceed to step 3
   - If NO → run `/planning` first (**mandatory**). MUST NOT proceed without PRD.
3. Analyze description and **recommend**:
   - Profile (F | B | FB | M | MB | FBM | SF | SM)
   - Architecture (monolith | monorepo) — matters especially for FB (monolith vs monorepo)
   - Framework (next | vite | expo)
   - Tier (ALWAYS | STANDARD | SCALE)
   - Deploy target (vercel, railway, supabase, etc.)
   - Tech stack per active rule files for the profile (e.g. `3.1-frontend.md`, `4.1-backend.md`, `4.2-supabase.md`, `5.1-mobile.md`)
   - List of features detected from description
3. Present recommendations in table format, ask developer to **approve/modify**
4. Once approved, generate `PROJECT.yaml` at project root using template from `<rules-source>/configs/PROJECT.yaml`
   - Fill all fields based on approved recommendations
   - `active_modules` auto-filled based on profile per mapping above
   - `features` filled based on description analysis
   - `deploy` filled per profile (remove irrelevant targets)
5. Ask developer to **review & approve** PROJECT.yaml
6. Once YAML is approved, scaffold project:
   - **If framework has CLI scaffolding** (Next.js/Vite/Expo):
     - Run framework CLI to generate project (e.g. `npx -y create-next-app@latest ./`, `npx -y create-vite@latest ./`, `npx -y create-expo-app@latest ./`)
     - Framework generates `package.json`, `tsconfig.json`, etc.
   - **If NO framework CLI** (pure backend Profile B, etc.):
     - Run `pnpm init`
     - Create folder structure per `<rules-source>/agents/rules/2.3-blueprint.md` + selected profile
// turbo
7. Copy active rule modules from `<rules-source>/agents/rules/` → `.agents/rules/` (only modules listed in `active_modules`)
// turbo
8. Copy `<rules-source>/configs/biome.json` → project root as `biome.json`
// turbo
9. Copy `<rules-source>/GEMINI.md` → project root
// turbo
10. Copy `<rules-source>/AGENTS.md` → project root
11. Merge `compilerOptions` from `<rules-source>/configs/tsconfig.base.json` into the project's existing `tsconfig.json`:
    - Add/Overwrite all options defined in the template
    - Do NOT overwrite existing framework-specific options (`module`, `target`, `paths`, etc.) that are absent from the template
// turbo
12. Generate `.gitignore` based on project needs
// turbo
13. Generate `.env.example` based on project needs
14. Install approved packages using `pnpm add <pkg>@latest`
15. Init git: `git init && git add . && git commit -m "chore: initial project setup"`
16. Display setup summary

## Rules

- Follow ALL rules in active_modules listed in PROJECT.yaml
- Install packages using `@latest`
- Meet ALL quality_gates in PROJECT.yaml
- Copy ONLY active rule modules to `.agents/rules/`, not all files
- Folder structure MUST match the framework-specific variant in `2.3-blueprint.md`

## Next Steps

After project is scaffolded:

- → `/add-feature` to implement the first feature from the PRD