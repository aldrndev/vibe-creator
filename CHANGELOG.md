# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Cursor-based pagination for high-cardinality endpoints
- Zod response validation schemas
- Circuit breakers for R2, Cobalt, and Xendit
- Docker development environment with hot reload
- Comprehensive documentation

### Changed

- Refactored large files to comply with 400 LOC limit
- Updated Prisma to v7 with driver adapters
- Migrated from HeroUI to Radix UI components

### Fixed

- JWT key ring initialization
- Fastify-static absolute path issue
- Docker compose volume paths

### Security

- Cryptographically secure JWT secrets
- ES256 key generation for token signing
- Enhanced .gitignore for sensitive files

## [0.1.0] - 2026-01-10

### Added

- Initial release
- User authentication with JWT
- Project management
- Video timeline editor
- AI Director (scene detection, transcription)
- Video export with FFmpeg
- URL download with Cobalt
- Payment integration with Xendit
- Streaming service
- Admin dashboard

### Tech Stack

- Frontend: React 19, Vite, Tailwind CSS, Radix UI
- Backend: Fastify, TypeScript, Prisma, PostgreSQL
- Queue: BullMQ, Redis
- Processing: FFmpeg, Whisper
- Storage: Cloudflare R2

---

## Template for New Releases

```markdown
## [X.Y.Z] - YYYY-MM-DD

### Added

- New features

### Changed

- Changes in existing functionality

### Deprecated

- Soon-to-be removed features

### Removed

- Removed features

### Fixed

- Bug fixes

### Security

- Security updates
```
