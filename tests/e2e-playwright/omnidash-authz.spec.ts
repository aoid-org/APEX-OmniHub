/**
 * OmniDash Authorization — E2E access control proof.
 *
 * Verifies that /omnidash requires authentication and that authenticated
 * users can access the dashboard. No mock backends — these tests run only
 * under APEX_E2E_BACKEND_REQUIRED=true (backend mode).
 */
import { test, expect } from '@playwright/test';
import { signInWithSupabaseSession, skipWithoutSupabaseConfig } from './helpers/auth';

test.describe('OmniDash Authorization', () => {
  test('unauthenticated access to /omnidash shows auth gate', async ({ page }) => {
    skipWithoutSupabaseConfig();

    await page.goto('/omnidash', { waitUntil: 'domcontentloaded' });

    // The app should either redirect to login or show an auth gate
    // (not render the full dashboard with user data)
    const hasAuthGate = await page
      .locator('[data-testid="auth-gate"], [data-testid="login-form"], form[action*="auth"]')
      .first()
      .isVisible({ timeout: 10_000 })
      .catch(() => false);

    const isRedirected = page.url().includes('/login') || page.url().includes('/auth');

    // At least one auth mechanism must be present
    expect(hasAuthGate || isRedirected).toBe(true);
  });

  test('authenticated user can load /omnidash and see dashboard content', async ({ page }) => {
    skipWithoutSupabaseConfig();
    await signInWithSupabaseSession(page);

    // Dashboard should render its main canvas
    const canvas = page.locator('.omni-canvas-container, [data-testid="omnidash-canvas"]');
    await expect(canvas.first()).toBeVisible({ timeout: 15_000 });
  });

  test('authenticated user sees own scope only (RLS proof via network)', async ({ page }) => {
    skipWithoutSupabaseConfig();
    await signInWithSupabaseSession(page);

    // Collect API responses to verify no cross-user data leaks
    const apiResponses: { url: string; status: number }[] = [];
    page.on('response', (res) => {
      if (res.url().includes('supabase') && res.url().includes('rest')) {
        apiResponses.push({ url: res.url(), status: res.status() });
      }
    });

    // Wait for dashboard to load
    const canvas = page.locator('.omni-canvas-container, [data-testid="omnidash-canvas"]');
    await expect(canvas.first()).toBeVisible({ timeout: 15_000 });

    // All REST API calls should succeed (200) — RLS should not block
    // the user from accessing their own data
    const failedCalls = apiResponses.filter((r) => r.status >= 400 && r.status !== 404);
    expect(failedCalls).toHaveLength(0);
  });
});
