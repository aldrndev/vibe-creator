---
trigger: always_on
---

# Digitesia Project Blueprint Rules — v1.0 (AUTHORITATIVE)

## 0) SCOPE & NON-REDUNDANCY (ABSOLUTE)

- This document defines ONLY: repo skeleton, placement rules, naming of files/paths, enforcement checks.
- It MUST NOT restate v3.6.7 rules (security/auth/testing/cicd-gates/docker-hardening/etc).
- If a rule is already in v3.6.7, this document references it implicitly and does not duplicate it.
- If conflict exists, v3.6.7 wins.

## 1) REPO PROFILE (AUTHORITATIVE)

- Every repo MUST declare exactly one profile: A, B, C, or D.
- Repo Profile MUST be declared in root README.md as a single line:
  - Repo Profile: A
  - Repo Profile: B
  - Repo Profile: C
  - Repo Profile: D
- Repo is INVALID if profile is missing.

Profiles:

- A: API Only
- B: Web + API
- C: Monorepo (Web + API + Worker + Packages + optional Mobile)
- D: Package/Library Only

## 2) TOP-LEVEL DIRECTORY ALLOWLIST (AUTHORITATIVE)

Only these top-level directories are allowed:

- apps/
- packages/ (only in Profile C/D)
- infra/
- docs/
- .github/

Any additional top-level directory requires Exception Protocol (v3.6.7).

## 3) FORBIDDEN TOP-LEVEL PATTERNS (AUTHORITATIVE)

Forbidden at repo root:

- server/, backend/, frontend/ (MUST be under apps/)
- scripts/ (MUST be infra/scripts/)
- deploy/ (MUST be infra/deploy/)
- docker/ (MUST be infra/compose/ unless exception)

Infra/provisioning/orchestration folders at repo root are FORBIDDEN.
If used, they MUST live under infra/deploy/multi-node/<tool>/.
Otherwise they MUST NOT exist.

Validation patterns (non-exhaustive):

- k8s/
- helm/
- terraform/
- ansible/
- pulumi/

## 4) REQUIRED REPO DECLARATIONS IN README (AUTHORITATIVE)

Root README.md MUST declare these flags as single-line key/value pairs:

- Repo Profile: A|B|C|D
- Uses Database: true|false
- CI Uses Compose: true|false
- Prod Single Node Supported: true|false
- Automated Deploy (GitHub Actions): true|false

These flags exist ONLY to make layout:check deterministic.

## 5) CANONICAL DIRECTORY LAYOUTS (AUTHORITATIVE)

### 5.1 Profile A — API Only (MUST)

Required paths:

- apps/
  - api/
    - src/
    - Dockerfile
    - package.json
    - .env.example
    - prisma/ (REQUIRED if Uses Database: true)
- infra/
  - compose/
    - docker-compose.dev.yml
    - docker-compose.ci.yml (REQUIRED if CI Uses Compose: true)
    - docker-compose.prod.single-node.yml (REQUIRED if Prod Single Node Supported: true)
  - scripts/
  - deploy/
- docs/
  - architecture/
  - runbooks/
  - decisions/
- .github/
  - workflows/
    - ci.yml
    - release.yml
    - deploy.yml (REQUIRED if Automated Deploy (GitHub Actions): true)
- .env.example
- README.md
- eslint.config.js
- package.json
- pnpm-lock.yaml
- pnpm-workspace.yaml

Constraints:

- apps/api/prisma/ is FORBIDDEN if Uses Database: false.

### 5.2 Profile B — Web + API (MUST)

Required paths:

- apps/
  - api/
    - src/
    - Dockerfile
    - package.json
    - .env.example
    - prisma/ (REQUIRED if Uses Database: true)
  - web/
    - src/ OR app/ (framework root allowed)
    - Dockerfile
    - package.json
    - .env.example
- infra/
  - compose/
    - docker-compose.dev.yml
    - docker-compose.ci.yml (REQUIRED if CI Uses Compose: true)
    - docker-compose.prod.single-node.yml (REQUIRED if Prod Single Node Supported: true)
  - scripts/
  - deploy/
- docs/
  - architecture/
  - runbooks/
  - decisions/
- .github/
  - workflows/
    - ci.yml
    - release.yml
    - deploy.yml (REQUIRED if Automated Deploy (GitHub Actions): true)
- .env.example
- README.md
- eslint.config.js
- package.json
- pnpm-lock.yaml
- pnpm-workspace.yaml

Constraints:

- apps/api/prisma/ is FORBIDDEN if Uses Database: false.

### 5.3 Profile C — Monorepo (MUST)

Required paths:

- apps/
  - api/
    - src/
    - Dockerfile
    - package.json
    - .env.example
    - prisma/ (FORBIDDEN always in Profile C)
  - worker/
    - src/
    - Dockerfile
    - package.json
    - .env.example
  - web/
    - src/ OR app/ (framework root allowed)
    - Dockerfile
    - package.json
    - .env.example
  - mobile/ (OPTIONAL; see 5.4)
- packages/
  - database/ (REQUIRED if Uses Database: true)
    - prisma/
      - schema.prisma
    - src/
      - index.ts (ONLY public entry)
      - client.ts
    - package.json
  - shared/ (RECOMMENDED)
    - src/
    - package.json
  - config/ (RECOMMENDED)
    - src/
    - package.json
  - observability/ (RECOMMENDED)
    - src/
    - package.json
  - ui-kit/ (OPTIONAL)
    - src/
    - package.json
- infra/
  - compose/
    - docker-compose.dev.yml
    - docker-compose.ci.yml (REQUIRED if CI Uses Compose: true)
    - docker-compose.prod.single-node.yml (REQUIRED if Prod Single Node Supported: true)
  - scripts/
  - deploy/
    - single-node/
    - multi-node/
- docs/
  - architecture/
  - runbooks/
  - decisions/
- .github/
  - workflows/
    - ci.yml
    - release.yml
    - deploy.yml (REQUIRED if Automated Deploy (GitHub Actions): true)
- .env.example
- README.md
- eslint.config.js
- package.json
- pnpm-lock.yaml
- pnpm-workspace.yaml

Constraints:

- packages/database/ is FORBIDDEN if Uses Database: false.
- apps MUST import DB only via @pkg/database when Uses Database: true.

### 5.4 Profile C — Mobile Extension (Expo) (AUTHORITATIVE)

If apps/mobile exists:

- apps/
  - mobile/
    - package.json
    - .env.example
    - app/ OR src/
    - assets/

Constraints:

- apps/mobile MUST NOT host shared logic; shared logic MUST live in packages/\*.
- apps/mobile MUST use @pkg/\* for shared imports; ../../ imports are FORBIDDEN.

### 5.5 Profile D — Package/Library Only (MUST)

Required paths:

- packages/
  - <package-name>/
    - src/
    - package.json
    - tsconfig.json
- docs/
  - decisions/ (REQUIRED if any exception exists)
- .github/
  - workflows/
    - ci.yml
    - release.yml
- README.md
- eslint.config.js
- package.json
- pnpm-lock.yaml

Constraints:

- apps/ is FORBIDDEN in Profile D.

## 6) APP DIRECTORY CONTRACT (AUTHORITATIVE)

Every app under apps/<app>/ MUST contain:

- package.json
- .env.example
- src/ OR framework root (app/ or pages/) (framework root allowed only for web/mobile)
- Dockerfile:
  - REQUIRED for api
  - REQUIRED for worker
  - REQUIRED for web
  - OPTIONAL for mobile

## 7) BACKEND APP SKELETON (PLACEMENT ONLY)

If apps/api exists, apps/api/src MUST contain:

- config/
- lib/
- plugins/
- modules/
- shared/ (optional; minimal)
- index.ts

## 8) WORKER APP SKELETON (PLACEMENT ONLY)

If apps/worker exists, apps/worker/src MUST contain:

- config/
- lib/
- queues/
- jobs/
- processors/
- index.ts

## 9) WEB APP SKELETON (PLACEMENT ONLY)

If apps/web exists, it MUST contain:

- components/
- features/
- lib/
- styles/

Additionally:

- apps/web MUST have src/ OR app/ as routing/framework root.
- components/features/lib/styles MUST exist under apps/web/src/ OR apps/web/app/ (whichever exists as the framework root).

## 10) DATABASE PLACEMENT (AUTHORITATIVE)

- Profile A/B + Uses Database: true:
  - apps/api/prisma/schema.prisma MUST exist.
- Profile C + Uses Database: true:
  - packages/database/prisma/schema.prisma MUST exist.
  - apps/api/prisma is FORBIDDEN.
  - apps/worker/prisma is FORBIDDEN.

## 11) PACKAGES CONTRACT (AUTHORITATIVE)

Packages MUST be located in:

- packages/<kebab-case-name>/

Mandatory internal structure for every package:

- package.json
- src/index.ts (ONLY public entry point)

Recommended standard packages (non-exhaustive):

- packages/database
- packages/config
- packages/observability
- packages/ui-kit
- packages/shared

Packages MUST NOT:

- load dotenv
- read filesystem at import time
- silently depend on process env at import time

## 12) INFRA CONTRACT (AUTHORITATIVE)

infra/ MUST contain:

- compose/
- scripts/
- deploy/

All compose manifests MUST live in infra/compose/.
All operational scripts MUST live in infra/scripts/.
All deploy assets MUST live in infra/deploy/.

## 13) COMPOSE FILE NAMING (AUTHORITATIVE)

Standard compose file names:

- infra/compose/docker-compose.dev.yml
- infra/compose/docker-compose.ci.yml
- infra/compose/docker-compose.prod.single-node.yml

If a mode is unsupported, the compose file MAY be omitted ONLY if README flags declare it false.

## 14) DEPLOY ASSET PLACEMENT (AUTHORITATIVE)

If deployment assets exist, they MUST be placed under:

- infra/deploy/single-node/
- infra/deploy/multi-node/

If any orchestration/provisioning tool is used, its assets MUST be under:

- infra/deploy/multi-node/<tool>/

## 15) WORKFLOW FILE CONTRACT (AUTHORITATIVE)

Every repo MUST have:

- .github/workflows/ci.yml
- .github/workflows/release.yml

deploy.yml:

- REQUIRED only if Automated Deploy (GitHub Actions): true.

## 16) ROOT SCRIPT CONTRACT (PLACEMENT/NAMING ONLY) (AUTHORITATIVE)

Root package.json MUST include scripts:

- dev
- build
- lint
- typecheck
- test
- layout:check

If apps exist, required shortcuts:

- api (runs apps/api)
- worker (runs apps/worker) (only if exists)
- web (runs apps/web) (only if exists)
- mobile (runs apps/mobile) (only if exists)

Forbidden script names:

- server
- backend
- frontend

### 16.1 ROOT SCRIPT CONTRACT — DOCKER (AUTHORITATIVE)

If the repo uses Docker Compose (infra/compose exists), root package.json MUST include Docker scripts.

Development Docker Scripts (REQUIRED):

- docker:up
- docker:down
- docker:logs
- docker:ps
- docker:restart
- docker:build
- docker:up:build

Production Docker Scripts (REQUIRED only if Prod Single Node Supported: true):

- docker:prod:up
- docker:prod:down
- docker:prod:logs
- docker:prod:ps
- docker:prod:restart
- docker:prod:build
- docker:prod:up:build

Forbidden Docker Script Names:

- docker:start (use docker:up)
- docker:stop (use docker:down)
- compose:ANY (use docker:ANY)

Docker Script Naming Convention (ABSOLUTE):

- Prefix:
  - docker: for development
  - docker:prod: for production
- Suffix:
  - :build for build-only
  - :up:build for build + start

## 17) ENFORCEMENT CONTRACT (AUTHORITATIVE)

Every repo MUST implement:

- pnpm layout:check

layout:check MUST validate:

- README flags existence (Section 4)
- profile line correctness
- top-level allowlist compliance
- forbidden top-level patterns absence
- canonical layout compliance for declared profile
- compose files existence based on README flags
- workflow files existence based on README flags
- app-scoped .env.example existence for each app
- DB placement rules based on profile + Uses Database flag

layout:check MUST:

- fail non-zero on any violation
- print actionable violation list
- never print secrets

CI MUST run pnpm layout:check on every push & PR.

## 18) DOCS DIRECTORY CONTRACT (AUTHORITATIVE)

docs/ MUST contain:

- docs/architecture/
- docs/runbooks/
- docs/decisions/

docs/decisions/ MUST contain:

- adr-0001-template.md (or equivalent)
- adr-\*.md for exceptions and major decisions

## 19) ADR REQUIREMENT (AUTHORITATIVE)

Any deviation from this blueprint MUST be documented as:

- docs/decisions/adr-xxxx-blueprint-exception-<slug>.md

## 20) MIGRATION RULE (AUTHORITATIVE)

Existing repos MUST migrate to this blueprint at the next major refactor or platform migration.
Intermediate states are allowed ONLY if tracked as an ADR with a time limit.

## 21) COMPLIANCE CHECKLIST (AUTHORITATIVE)

Repo is compliant only if:

- README flags exist and are valid
- Repo Profile declared and matches layout
- top-level allowlist respected
- canonical layout satisfied for profile
- each app has app-scoped .env.example
- infra/compose and workflows exist based on flags
- pnpm layout:check exists and runs in CI
- any deviation has an ADR
