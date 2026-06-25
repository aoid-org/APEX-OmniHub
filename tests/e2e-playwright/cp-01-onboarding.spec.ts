/**
 * CP-01 — Onboarding
 * Journey: / → sign-up → first OmniDash load
 * Exit assertion: /omnidash loads, top-header present, no fatal console errors
 * Primary risks: auth token not set, email verify redirect, createContext errors
 *
 * Regression guard: verifies no mock/placeholder values render on first load.
 */
import { test, expect, type Page } from '@playwright/test';

const FATAL = /createContext|Cannot read properties of undefined|ChunkLoadError|Loading chunk|Failed to fetch dynamically imported module/;
const MOCK_SENTINEL = /placeholder|mock data|lorem ipsum|TODO/i;

function trackConsole(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(`PAGEERROR: ${e.message}`));
  return errors;
}

test.describe('CP-01 — Onboarding', () => {
  test.describe.configure({ mode: 'serial' });

  test('login page renders without fatal errors', async ({ page }) => {
    const errors = trackConsole(page);
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/login/);
    // Core login UI must be present
    await expect(page.locator('form, [data-testid="login-form"], input[type="email"], input[type="password"]').first()).toBeVisible({ timeout: 15_000 });
    expect(errors.filter((e) => FATAL.test(e))).toHaveLength(0);
  });

  test.skip('sign-up link / tab is accessible from login page', async ({ page }) => { // APEX-8013
    test.info().annotations.push({ type: 'issue', description: 'BLOCKED(APEX-8013): Sign Up tab intentionally removed from login flow' });
    await page.goto('/login');
    // We expect the auth UI to have a sign-up mode or link
    const signUpLink = page.getByRole('tab', { name: /sign up/i }).or(page.getByRole('link', { name: /sign up/i }));
    await expect(signUpLink).toBeVisible();
  });

  test('unauthenticated /omnidash redirects to auth (not blank)', async ({ page }) => {
    const errors = trackConsole(page);
    await page.goto('/omnidash', { waitUntil: 'domcontentloaded' });
    // Must redirect to login — not serve an unguarded blank page
    await expect(page).not.toHaveURL(/\/omnidash/, { timeout: 8_000 })
      .catch(() => {
        // If still on /omnidash, the ProtectedRoute must have rendered an auth boundary
        // (not the full authenticated shell)
        return expect(page.locator('[data-testid="omnidash-top-header"]')).not.toBeVisible({ timeout: 3_000 });
      });
    expect(errors.filter((e) => FATAL.test(e))).toHaveLength(0);
  });

  test('post-auth /omnidash load — top header visible, no mock text', async ({ page }) => {
    test.skip(!process.env.VITE_SUPABASE_URL, 'BLOCKED(APEX-8004): Requires VITE_SUPABASE_URL for authenticated flow');
    const errors = trackConsole(page);

    // Inject a valid session via localStorage to simulate post-sign-up state
    const { signInWithSupabaseSession } = await import('./helpers/auth');
    await signInWithSupabaseSession(page);

    await expect(page).toHaveURL(/\/omnidash/, { timeout: 30_000 });
    await expect(page.getByTestId('omnidash-top-header')).toBeVisible({ timeout: 15_000 });

    // Regression guard: no mock/placeholder text anywhere in body
    const bodyText = await page.locator('body').innerText();
    expect(MOCK_SENTINEL.test(bodyText), `Mock sentinel text found on first OmniDash load: ${bodyText.match(MOCK_SENTINEL)?.[0]}`).toBe(false);

    expect(errors.filter((e) => FATAL.test(e))).toHaveLength(0);
  });
});
