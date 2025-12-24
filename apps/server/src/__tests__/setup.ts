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
vi.stubEnv('NODE_ENV', 'test');
vi.stubEnv('DATABASE_URL', 'postgresql://test:test@localhost:5432/test');
vi.stubEnv('JWT_SECRET', 'test-jwt-secret-32-chars-minimum');
vi.stubEnv('JWT_REFRESH_SECRET', 'test-refresh-secret-32-chars-min');
