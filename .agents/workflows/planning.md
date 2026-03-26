---
description: Pre-project/pre-feature planning. Generate PRD with UI/UX direction before coding.
---

# /planning

## Purpose

Ensure every project or major feature starts with clear requirements and design direction BEFORE any code is written. This workflow enforces the planning flow from `2.1-planning.md`.

## Prerequisites

1. If existing project: read `PROJECT.yaml` for profile + tier context
2. If new project: gather basic description first

## Steps

1. **Gather requirements** — interview the developer:
   - What does the project/feature do? For whom?
   - Core features (list 3-5 minimum)
   - Who are the users? What are their roles?
   - What's out of scope?
   - What's the deployment target?
   - Authentication method (if applicable)?
   - Third-party integrations (if any)?

2. **Determine PRD depth** based on tier:
   - `ALWAYS` tier → Lightweight PRD (see `2.1-planning.md`)
   - `STANDARD` / `SCALE` tier → Full PRD (see `2.1-planning.md`)
   - If tier is unknown → default to Lightweight, upgrade later

3. **IF frontend/mobile project → define UI/UX Direction:**
   - Color palette selection — describe mood, personality, and specific hue direction
   - Typography choice — select from recommended fonts in `2.2-design.md`
   - Layout type — dashboard | landing | app | portal | admin
   - Key pages/screens — list main views with layout description
   - Visual reference/inspiration (optional but recommended)
   - Dark mode support? (yes / no / future)

4. **Define data model sketch:**
   - Core entities and their key fields
   - Relationships between entities
   - This is high-level, NOT a full schema

5. **Generate `docs/prd.md`:**
   - Use the template from `2.1-planning.md` (Lightweight or Full based on tier)
   - MUST include the UI/UX Direction section for frontend/mobile projects
   - Create `docs/` directory if it doesn't exist

6. **Ask developer to approve PRD**
   - Developer reviews and either approves or requests changes
   - If changes requested → update PRD and re-present
   - MUST NOT proceed without approval

## Next Steps

After PRD is approved:

- **New project** → run `/new-project` to scaffold
- **Existing project** → run `/add-feature` to implement

## Rules

- MUST follow PRD template from `2.1-planning.md`
- MUST include UI/UX Direction section for any project with a frontend or mobile component
- MUST NOT proceed to coding without developer approval on PRD
- PRD is a living document — update it when requirements change
