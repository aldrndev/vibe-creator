# Security Policy

Vibe Creator includes security-sensitive surfaces such as authentication, media uploads, project assets, export downloads, RTMP stream keys, billing and quota flows, webhook handling, and admin actions.

## Supported Versions

Vibe Creator is currently in early public alpha. Security fixes are applied to the `main` branch until the first stable release process is defined.

## Reporting a Vulnerability

Please do not open a public issue for security vulnerabilities.

Report privately to the maintainer with:

- The affected route, module, feature, or workflow.
- Reproduction steps.
- Expected impact.
- Whether the issue may expose secrets, user data, project assets, billing or quota state, stream keys, exports, or admin actions.
- Any safe proof of concept that does not expose real credentials or private user data.

## Security Expectations

Security-related changes should include regression tests where practical and should follow these project rules:

- Validate API input and output with Zod.
- Check authorization server-side for protected resources.
- Keep tenant and owner checks close to repository/data-access code.
- Never log tokens, passwords, webhook payloads, stream keys, or secrets.
- Never expose raw local filesystem paths to the frontend.
- Keep export, download, and streaming endpoints ownership-safe.
- Protect user-provided URL flows against SSRF and private network access.

## Disclosure

The maintainer will verify the report, patch the root cause, and publish an advisory or changelog note when it is safe to do so.
