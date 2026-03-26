/**
 * Global test setup
 * Runs before all tests
 */

import { beforeEach, vi } from 'vitest';

// Reset all mocks between tests
beforeEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
});

// Mock environment variables for tests
// NOTE: DATABASE_URL is NOT stubbed - integration tests use real .env values
vi.stubEnv('NODE_ENV', 'development');
vi.stubEnv('REDIS_URL', 'redis://localhost:6379');
vi.stubEnv('JWT_SECRET', 'test-jwt-secret-32-chars-minimum');
vi.stubEnv('JWT_REFRESH_SECRET', 'test-refresh-secret-32-chars-min');
vi.stubEnv('FRONTEND_URL', 'http://localhost:5173');
vi.stubEnv(
  'JWT_SIGNING_KEY',
  JSON.stringify({
    kty: 'EC',
    crv: 'P-256',
    x: 'o3ULdy25pgEEEjcLPuCOLkWsa96NgMlyOEoD3R6dFj4',
    y: 'C5vKE0q1EcGz8wglE-o55ijZxFMu-StitDF9oCnHNMg',
    d: 'DZfMqtVeTJKnvp9Ce5UpGRyA9kuvDRS7KYz_FlxSzic',
  }),
);
vi.stubEnv(
  'JWT_VERIFY_KEYS',
  JSON.stringify([
    {
      kty: 'EC',
      crv: 'P-256',
      x: 'o3ULdy25pgEEEjcLPuCOLkWsa96NgMlyOEoD3R6dFj4',
      y: 'C5vKE0q1EcGz8wglE-o55ijZxFMu-StitDF9oCnHNMg',
    },
  ]),
);
