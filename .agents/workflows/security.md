---
description: Security audit following OWASP standards and 8.1-security rules.
---

# /security

## Prerequisites

1. Read `PROJECT.yaml` at project root
2. Follow rules in `8.1-security.md`

## Steps

1. Read `PROJECT.yaml` for context (auth mode, features, deploy target)
2. Audit based on `8.1-security.md`:

### Secrets Management
- [ ] No hardcoded secrets (grep for API keys, passwords, tokens)
- [ ] `.env` is in `.gitignore`
- [ ] All secrets via environment variables

### Authentication
- [ ] Proper JWT validation (jose library)
- [ ] Proper password hashing (argon2)
- [ ] Secure session management (httpOnly cookies if applicable)
- [ ] Token expiry and refresh flow

### Authorization
- [ ] Deny-by-default pattern
- [ ] Role/permission checks on every protected endpoint
- [ ] No broken access control

### Input Validation
- [ ] ALL endpoints have Zod schemas (input AND output)
- [ ] File upload validation (type, size)
- [ ] Query parameter validation

### SQL / Database
- [ ] Prisma parameterized queries (no raw SQL without parameterization)
- [ ] Proper indexing on queried columns

### XSS & CORS
- [ ] Proper output encoding
- [ ] Restrictive CORS configuration (not `*`)
- [ ] Content-Security-Policy headers

### Dependencies
// turbo
- [ ] Run `pnpm audit` — report vulnerabilities

### Rate Limiting
- [ ] Auth endpoints (login, register, reset-password)
- [ ] Sensitive API endpoints

### Supabase (SF / SM profiles)
- [ ] RLS enabled on ALL tables
- [ ] Every table has at least one RLS policy
- [ ] `service_role` key ONLY in server-side / Edge Functions — NEVER in client
- [ ] Storage buckets NOT public unless explicitly justified
- [ ] Supabase Auth used (no custom auth unless required)
- [ ] Database migrations tracked in `supabase/migrations/`

3. Display results in checklist format:
   - ✅ Pass / ❌ Fail / ⚠️ Warning per category
4. For each ❌ fail, provide fix recommendation + reference to rule

## Rules

- Follow `8.1-security.md` for all standards
- OWASP Top 10 as baseline

## Next Steps

After security issues are fixed:

- → Re-run `/security` to verify fixes
- → `/review` for overall quality check
