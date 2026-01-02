---
trigger: always_on
---

# Digitesia Engineering Standard — v3.5

## OUTPUT CONTRACT (ABSOLUTE)

- OUTPUT ONLY: .ts, .tsx, .json, .yaml, .sql, .md
- NO explanations, NO conversational text, NO emojis
- PRODUCTION-READY ONLY
- If unclear → FAIL FAST with:
  // TODO: requirements unclear

## CODE QUALITY (ABSOLUTE)

### ESLint (MANDATORY)

rules:

- no-console: warn
- @typescript-eslint/no-explicit-any: error
- @typescript-eslint/no-unused-vars: warn (argsIgnorePattern: ^\_)
- @typescript-eslint/no-deprecated: error

### Type Safety

- `any` STRICTLY FORBIDDEN
- Use `unknown` only when unavoidable + explicit narrowing
- Deprecated APIs / libraries STRICTLY FORBIDDEN

### Dependency Rules (PRODUCTION-SAFE)

- New dependencies MAY be installed using `package@latest`
- After installation:
  - Version MUST be pinned in package.json
  - Lockfile MUST be committed
- Floating versions FORBIDDEN: latest, \*, ^, ~
- Production codebases MUST be reproducible

### Error Handling

- On errors: AI MUST search official documentation
- Guessing or speculative fixes FORBIDDEN

### Validation

- Zod REQUIRED for:
  - API input/output
  - Environment variables
  - DTOs (schema-first)

## NAMING & IMPORTS

- Files: kebab-case.suffix.ts
- Directories: kebab-case
- Variables / functions: camelCase
- Env vars: UPPER_SNAKE_CASE
- Path aliases @/ REQUIRED
- Relative imports ../../ FORBIDDEN
- Cross-feature imports FORBIDDEN

## CONTINUOUS INTEGRATION (CI)

- CI MUST run on every push & pull request
- Merge to main/master FORBIDDEN if CI fails
- CI MUST run at minimum:
  - lint
  - typecheck
  - build
  - test (if present)
- CI is authoritative; local checks non-binding

## OBSERVABILITY

- Structured logging REQUIRED
- requestId REQUIRED
- Global error handler REQUIRED
- Raw errors & stack traces MUST NOT be exposed
- Observability OPTIONAL ONLY in PROTOTYPE_MODE

## UI / UX REQUIREMENTS

### Pre-Implementation Questions (MANDATORY)

AI MUST ask:

1. Theme: dark / light / both (toggle)
2. Language: ID / EN / ID+EN (auto-detect)
3. Frontend Framework (ONLY if not already defined by project context):
   - React (Vite)
   - Next.js

### UI Stack (ABSOLUTE)

- Headless primitives: **Radix UI**
- Styling: **Tailwind CSS (custom components)**
- Prebuilt component kits (e.g. shadcn/ui) **FORBIDDEN as dependency**
- Copying patterns from shadcn/ui is ALLOWED, but code MUST be owned, audited, and customizable

Rationale:

- Avoid hidden abstractions
- Avoid version coupling
- Full control over styling, behavior, and accessibility
- Long-term robustness over convenience

### Design System

- Semantic CSS variables REQUIRED
- Tokens ONLY:
  - --color-\*
  - --space-\*
  - --font-size-\*
- Theme switching via CSS variables
- Hardcoded colors FORBIDDEN
- Component styles MUST be co-located and explicit

### Visual Standards

- Premium, modern, professional aesthetic
- Mobile-first responsive
- Pixel-perfect
- Animations ONLY when they add UX value
- Decorative-only animations FORBIDDEN
- Min touch target: 44x44px
- Accessibility labels REQUIRED
- Placeholders MUST NOT replace labels

### i18n

- ID + EN
- Auto-detect language
- Fallback: EN

### SEO & Performance

- Semantic HTML5
- Single H1 per page
- Proper heading hierarchy
- Meta tags: title, description, og:\*
- Lazy loading & code splitting
- Avoid layout shift (CLS ≤ 0.1)
- LCP ≤ 2.5s

## BACKEND — FASTIFY

Stack: fastify, typescript (strict), zod, prisma, postgresql, pino

- Thin controllers
- Business logic in services
- Global error handler REQUIRED
- API versioning REQUIRED: /api/v1
- Pagination REQUIRED (default 20, max 100)

## DATABASE

- Prisma ONLY
- Manual DB changes FORBIDDEN
- Raw SQL: performance-critical, parameterized, documented
- UTC timestamps ONLY
- Currency as integers
- Soft delete default
- Transactions REQUIRED for multi-aggregate mutations

## API RESPONSE CONTRACT

- Success:
  { success: true, data: {}, meta: {} }
- Error:
  { success: false, error: { code: ERROR_CODE, message: ... } }

- HTTP status codes MUST be semantic
- Raw errors MUST NOT be exposed

## FRONTEND — REACT

Stack: react, vite, typescript, @tanstack/react-query, zustand, react-hook-form, zod, tailwindcss, radix-ui

- Server state: React Query
- Client state: Zustand (slice-based)
- Forms: react-hook-form
- Headless UI: Radix UI ONLY
- Prebuilt UI kits FORBIDDEN
- Direct fetch FORBIDDEN
- Max component size: 300 lines
- Stable keys REQUIRED
- Error boundaries at route level
- Suspense for lazy loading
- UI components MUST be owned, explicit, and auditable

## MOBILE — EXPO

Stack: expo, expo-router, react-native, nativewind v4, zustand, react-query, zod

- Secure storage: Keychain / Keystore
- AsyncStorage FORBIDDEN for secrets
- Accessibility labels REQUIRED
- Min touch target: 44x44px

## SECURITY (ABSOLUTE)

- Secrets NEVER committed
- .env.example REQUIRED
- Token-based auth ONLY
- Access tokens short-lived
- Refresh tokens revocable
- Tokens NOT in localStorage
- CSRF protection for cookies
- Rate limiting REQUIRED

## SECURITY HARDENING (ABSOLUTE)

- Assume attacker is an authenticated user (zero trust internal)
- Authorization MUST be enforced server-side on EVERY request
- Client-side checks are NON-SECURITY and MUST NOT be relied upon

- IDOR protection REQUIRED:

  - Resource ownership MUST be verified on access
  - Sequential / guessable IDs FORBIDDEN
  - Use UUID / opaque identifiers

- Mass assignment FORBIDDEN:

  - Explicit allowlist for writable fields REQUIRED
  - DTOs MUST NOT be spread blindly into persistence layers

- Rate limiting REQUIRED on:

  - Auth endpoints
  - Payment endpoints
  - Resource mutation endpoints

- Error messages MUST NOT reveal:

  - Existence of resources
  - Authorization logic
  - Internal identifiers

- Cache MUST NOT store user-specific or sensitive data:
  - Cache-Control: private, no-store

## TESTING

- Service-level tests SHOULD exist
- Snapshot tests FORBIDDEN
- Tests MUST be deterministic
- At least one negative test REQUIRED

## BACKGROUND JOBS

Stack: BullMQ + Redis

- Jobs MUST be idempotent
- Retry, backoff, timeout REQUIRED
- Dead-letter queue REQUIRED
- Business logic NOT in workers

## CACHING

- Redis REQUIRED
- TTL REQUIRED for all keys
- Invalidate on mutation
- Key format: entity:id, entity:list:params
- User-specific data MUST NOT be cached at CDN layer

## DOCKER

- Dockerfile + docker-compose.yml REQUIRED
- Multi-stage builds
- .dockerignore mirrors .gitignore
- Env via compose or .env
- Hardcoded env FORBIDDEN
- Health checks REQUIRED
- Pin image versions (NO latest)
- Containers run as non-root

## MONOREPO (IF APPLICABLE)

- Package manager: pnpm + workspaces
- Root scripts:
  - pnpm server
  - pnpm web
  - pnpm mobile
  - pnpm dev

## FORBIDDEN SHORTCUTS

- any for speed → breaks type safety
- console.log → use structured logging
- DB in controllers → violates layering
- !important → CSS maintenance risk
- @ts-ignore without reason → hides errors
- Hardcoded URLs/secrets → security risk

## ARCHITECTURAL ROBUSTNESS (ABSOLUTE)

- Shortcut implementations FORBIDDEN, even if they:
  - Pass lint/typecheck
  - Reduce code size
  - Work in happy path only
- Prefer long-term maintainability over short-term simplicity
- Prefer explicit patterns over implicit behavior
- Fragile or “works-for-now” solutions FORBIDDEN
- Experimental features MAY be used ONLY as optimization, not as architecture

## DATA & STATE ARCHITECTURE (ABSOLUTE)

- Mixing responsibilities FORBIDDEN:
  - Server cache MUST NOT be source of truth
  - Client cache MUST NOT replace server validation
- Single source of truth REQUIRED per concern
- Cache is performance-only, never correctness
- Duplicate sources of truth FORBIDDEN

## FRAMEWORK-SPECIFIC BEST PRACTICE (ABSOLUTE)

### Next.js

- RSC caching MUST NOT be relied upon for data correctness
- `loading.tsx` is server lifecycle, not UX bug
- Experimental flags MUST NOT define core behavior

### React Query

- `initialData` shortcuts FORBIDDEN for dashboards or multi-query pages
- Proper hydration REQUIRED: dehydrate + HydrationBoundary
- Mutations MUST invalidate queries
- Manual refetch hacks FORBIDDEN

## CHANGE SAFETY RULE (ABSOLUTE)

- Any solution that is:
  - Hard to roll back
  - Dependent on undocumented behavior
  - Likely to hide future bugs
    is FORBIDDEN unless explicitly requested
- Prefer reversible, incremental, fail-loud designs

## AI DECISION RULE (ABSOLUTE)

When multiple solutions exist, AI MUST choose the one that is:

1. Most explicit
2. Most boring
3. Most widely accepted as best practice
4. Least dependent on framework magic
5. Safest under scale, concurrency, and future change

“Shortcut because faster” reasoning is INVALID.

## AI BEHAVIOR

AI MUST:

- Prefer boring over clever
- Prefer explicit over implicit
- Search docs on errors
- Ask required UI/UX questions

AI MUST NOT:

- Add unrequested features
- Use deprecated APIs
- Guess when unclear
- Skip theme/i18n questions
- Touch files outside scope

## PROTOTYPE_MODE

Activated by: Use PROTOTYPE_MODE

- Tests & observability OPTIONAL
- Validation MINIMAL
- Expires after ONE response

Never relaxed:

- any forbidden
- No secrets
- Parameterized SQL
- Token-based auth
