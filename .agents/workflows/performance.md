---
description: Performance audit for queries, bundle size, and optimization.
---

# /performance

## Prerequisites

1. Read `PROJECT.yaml` at project root
2. Follow rules in `3.1-frontend.md`, `4.1-backend.md`, `4.2-supabase.md`

## Steps

// turbo
1. Read `PROJECT.yaml` for context (profile, features)

### Backend Performance (if profile has backend)
- [ ] N+1 query detection — check Prisma `include` and `findMany` patterns
- [ ] Missing database indexes on frequently queried / filtered / sorted columns
- [ ] Pagination implemented (no unlimited result sets)
- [ ] Proper caching strategy (Redis if [STANDARD]+)
- [ ] Background jobs for heavy operations (BullMQ)
- [ ] Connection pooling configured

### Frontend Performance (if profile has frontend)
- [ ] `React.lazy()` / dynamic imports for heavy components
- [ ] Image optimization (`next/image` or `sharp`)
- [ ] Proper Tanstack Query cache configuration
- [ ] No unnecessary re-renders (memo, useMemo, useCallback where needed)
- [ ] Tree-shaking friendly imports (no `import * as`)
- [ ] Font optimization (preload, swap)

### Supabase Performance (if profile SF or SM)
- [ ] RLS policy complexity — avoid multi-join policies that slow queries
- [ ] Use database functions for complex queries (instead of multiple client calls)
- [ ] Pagination via Supabase `.range()` — no unlimited selects
- [ ] Storage: signed URLs with reasonable expiry vs public URLs
- [ ] Avoid N+1 Supabase client calls — batch with `.in()` filters

### General
- [ ] No blocking operations in request path
- [ ] Proper error boundaries
- [ ] Loading states and skeleton screens

2. Display results:
   - ✅ Pass / ❌ Issue / ⚠️ Suggestion per category
3. For each issue, provide fix recommendation

## Rules

- Follow architecture rules in active_modules
- Performance optimization MUST NOT sacrifice readability without justification

## Next Steps

After performance issues are fixed:

- → Re-run `/performance` to verify improvements
- → `/review` for overall quality check
