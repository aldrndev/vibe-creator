---
description: Deploy checklist and guide for target platform.
---

# /deploy

## Prerequisites

1. Read `PROJECT.yaml` at project root
2. Follow rules in `9.1-deployment.md`

## Steps

1. Read `PROJECT.yaml` → `deploy` section for target platform
2. Run CI gates:
// turbo
   - `pnpm biome check .`
// turbo
   - `pnpm tsc --noEmit`
// turbo
   - `pnpm test`
// turbo
   - `pnpm build`
3. Verify environment:
   - Check all required env vars are set on target platform
   - Check `.env.example` vs actual env vars
   - Ensure secrets are NOT in code
4. Deploy guide based on target:

### Vercel (Frontend)
- Verify `vercel.json` or framework detection
- Verify environment variables in Vercel dashboard
- Verify build command and output directory

### Railway / Render (Backend)
- Verify `Dockerfile` exists and is correct
- Verify environment variables in dashboard
- Verify health check endpoint
- Verify database connection string

### Supabase (Database)
- Verify migrations applied
- Verify RLS policies
- Verify service role key is ONLY on backend

### VPS + Docker
- Verify `docker-compose.prod.yml`
- Verify reverse proxy (nginx/traefik)
- Verify SSL certificates
- Verify firewall rules

5. Post-deploy checklist:
   - [ ] Health check endpoint responding
   - [ ] Auth flow working
   - [ ] Critical user flows tested
   - [ ] Error monitoring active (if [STANDARD]+)

## Rules

- Follow `9.1-deployment.md` for all deployment standards
- MUST NOT deploy without all CI gates passing
- MUST NOT hardcode secrets

## Next Steps

Deployment is a terminal workflow. No further workflows needed.
