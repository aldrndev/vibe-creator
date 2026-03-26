import { expect, test } from '@playwright/test';

/**
 * Smoke Tests
 *
 * Per Digitesia Testing Standard:
 * - Validate deployment readiness
 * - Check core pages load
 * - Verify basic navigation
 */

test.describe('Smoke Tests', () => {
  test('landing page loads', async ({ page }) => {
    await page.goto('/');

    // Check page title or main heading
    await expect(page).toHaveTitle(/Vibe Creator|Content Creative/i);
  });

  test('login page accessible', async ({ page }) => {
    await page.goto('/login');

    // Check for any form element on login page
    await expect(page.locator('input[type="email"], input[name="email"]').first()).toBeVisible({
      timeout: 10000,
    });
  });

  test('register page accessible', async ({ page }) => {
    await page.goto('/register');

    // Check for any form element on register page
    await expect(page.locator('input[type="email"], input[name="email"]').first()).toBeVisible({
      timeout: 10000,
    });
  });

  test('protected routes redirect to login', async ({ page }) => {
    // Try to access dashboard without auth
    await page.goto('/dashboard');

    // Should redirect to login
    await expect(page).toHaveURL(/login/);
  });
});
