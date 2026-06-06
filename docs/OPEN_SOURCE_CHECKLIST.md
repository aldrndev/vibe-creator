# Open Source Readiness Checklist

Use this checklist before announcing Vibe Creator publicly or submitting it to open-source support programs.

## Repository Profile

- [ ] Add GitHub About description.
- [ ] Add GitHub topics.
- [ ] Confirm repository visibility is public.
- [ ] Confirm the default branch is `main`.
- [ ] Confirm the root `README.md` explains project purpose, architecture, setup, and status.
- [ ] Confirm the root `LICENSE` is present and accurate.

## Documentation

- [ ] Keep `README.md` setup commands aligned with `package.json` scripts.
- [ ] Keep `CONTRIBUTING.md` aligned with local development workflow.
- [ ] Keep `SECURITY.md` current for vulnerability reporting.
- [ ] Add screenshots or a demo walkthrough.
- [ ] Add troubleshooting notes for Docker, PostgreSQL, Redis, FFmpeg, and Python setup.

## Community

- [ ] Maintain issue templates for bugs and feature requests.
- [ ] Maintain the pull request template.
- [ ] Create `good first issue` tasks for docs, examples, setup diagnostics, and tests.
- [ ] Keep public issues safe and free of secrets or exploit details.

## Release

- [ ] Run `pnpm lint`.
- [ ] Run `pnpm typecheck`.
- [ ] Run `pnpm test`.
- [ ] Run `pnpm build`.
- [ ] Prepare release notes in `docs/releases/`.
- [ ] Publish a GitHub release such as `v0.1.0-alpha`.

## Security

- [ ] Check that `.env` files and secrets are ignored.
- [ ] Check that sample env files contain placeholders only.
- [ ] Confirm logs do not expose tokens, stream keys, passwords, webhook payloads, or raw private user data.
- [ ] Confirm export, download, streaming, and admin actions are ownership-safe.
- [ ] Confirm user-provided URL flows include SSRF and private network protections.
