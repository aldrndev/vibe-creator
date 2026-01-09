---
trigger: always_on
---

# FRONTEND — REACT / NEXT.JS

Stack: react-vite / next.js, typescript, react-query, zustand, react-hook-form, zod, tailwindcss, radix-ui

- Server state: React Query
- Client state: Zustand (slice-based)
- Direct fetch FORBIDDEN
- Error boundaries REQUIRED
- Suspense REQUIRED for lazy loading
- Stable keys REQUIRED
- Max component size: 500 Line of Code (Strict)

## UI / UX (AUTHORITATIVE)

- Mobile-first REQUIRED
- Radix UI ONLY
- Tailwind with semantic CSS variables ONLY
- Prebuilt kits FORBIDDEN unless internal-owned
- Accessibility REQUIRED:
  - minimum 44x44px touch targets
  - keyboard navigation
  - screen reader compatibility
- Placeholders MUST NOT replace labels
- Animations ONLY if UX-justified
- Hover-only interactions FORBIDDEN
- Horizontal scroll on mobile FORBIDDEN unless explicitly justified via Exception Protocol

## USER FEEDBACK (AUTHORITATIVE)

- window.alert / confirm / prompt FORBIDDEN
- Toast notifications FORBIDDEN (all platforms)
- All user-facing messages MUST be inline and contextual

### Inline Message Rules

- Validation errors MUST be field-level (near the control)
- Submit errors MUST be section-level banners (near the form)
- Page-level notices allowed for non-critical info
- Action feedback allowed (e.g., button text changes)

### Message Lifetime Rules

- Error messages MUST persist until resolved or dismissed by user
- Success/info messages MAY auto-dismiss with bounded duration
- Auto-dismiss for errors is FORBIDDEN

### Async Completion Rules

- Background/async completion MUST be discoverable in-app
- Ephemeral-only completion feedback is FORBIDDEN

## DATA FETCHING (REACT QUERY)

- Query keys MUST be stable and deterministic
- initialData shortcuts FORBIDDEN
- Manual refetch hacks FORBIDDEN
- Proper hydration REQUIRED (when SSR/Next)
- Mutations MUST invalidate queries
- Retry MUST be bounded and MUST NOT cause retry storms

## CLIENT STATE (ZUSTAND)

- Slice-based stores REQUIRED
- Cross-slice imports FORBIDDEN (use store composition via explicit interfaces)
- Derived state MUST be computed selectors (no duplicate truth)

## FORMS

- react-hook-form REQUIRED for complex forms
- Zod schema as the source of truth REQUIRED
- Submit handlers MUST be idempotent when possible
- Double-submit protection REQUIRED

## ERROR HANDLING

- Error boundaries REQUIRED for route-level failures
- Global fallback UI MUST be accessible
- User-visible errors MUST not leak internal details
- requestId SHOULD be shown in a copyable UI element for support workflows

## PERFORMANCE (AUTHORITATIVE)

- Avoid layout shift (CLS ≤ 0.1)
- LCP ≤ 2.5s
- Code-splitting REQUIRED for non-critical routes
- Suspense MUST be used for lazy-loaded routes
- Large client bundles MUST be budgeted and tracked in CI

## SEO & I18N (WEB)

- Semantic HTML5
- Single H1 per page
- Proper heading hierarchy
- Meta tags: title, description, og:\* REQUIRED
- i18n: ID + EN, auto-detect, fallback EN
- Translation keys MUST be stable identifiers (not full sentences)

## NEXT.JS SPECIFIC

- RSC caching MUST NOT be relied upon for correctness
- loading.tsx is lifecycle, not UX
- Experimental flags MUST NOT define core behavior

## UI EXCEPTION RULE (ESCAPE HATCH)

UI exceptions allowed ONLY via Exception Protocol and MUST include:

- UX justification
- Accessibility impact assessment
- Isolation and rollback plan
