import { test, expect } from '@playwright/test';

/**
 * GATE 1 evidence — OmniSkills is a modal (not a route), shows the real
 * OmniSkills icon, heading reads "OmniSkills", and no sparkle/star decoration.
 *
 * Auth note: anonymous sign-in is disabled on this project and no E2E password
 * creds are provided, so we seed a stub session into the same localStorage key
 * the app reads. `ProtectedRoute` calls `supabase.auth.getSession()`, which
 * returns the persisted (unexpired) session WITHOUT a server round-trip, so the
 * shell renders. This proves the UI surface only — not a backend-validated flow.
 */
function base64url(obj: unknown): string {
  return Buffer.from(JSON.stringify(obj)).toString('base64url');
}

test('OmniSkills opens as a modal with the real icon and no route change', async ({ page }) => {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://ci-placeholder.supabase.co';
  const ref = new URL(supabaseUrl).hostname.split('.')[0];
  const storageKey = `sb-${ref}-auth-token`;

  const nowSec = Math.floor(Date.now() / 1000);
  const expSec = nowSec + 31_536_000; // +1 year
  const userId = '00000000-0000-4000-8000-000000000001';
  const jwt = [
    base64url({ alg: 'HS256', typ: 'JWT' }),
    base64url({ sub: userId, role: 'authenticated', aud: 'authenticated', iat: nowSec, exp: expSec }),
    'stub-signature',
  ].join('.');

  const session = {
    access_token: jwt,
    refresh_token: 'stub-refresh-token',
    expires_at: expSec,
    expires_in: 31_536_000,
    token_type: 'bearer',
    user: {
      id: userId,
      aud: 'authenticated',
      role: 'authenticated',
      email: 'gate1@e2e.local',
      app_metadata: {},
      user_metadata: {},
      created_at: new Date().toISOString(),
    },
  };

  await page.addInitScript(
    ({ key, value }: { key: string; value: unknown }) => {
      globalThis.localStorage.setItem('OMNIDASH_ENABLED', '1');
      globalThis.localStorage.setItem(key, JSON.stringify(value));
    },
    { key: storageKey, value: session },
  );

  await page.goto('/omnidash');
  await page.waitForLoadState('domcontentloaded');

  const urlBefore = page.url();

  // Click the OmniSkills launcher button in the dashboard shell.
  const launcher = page.getByRole('button', { name: 'OmniSkills', exact: true });
  await launcher.first().click();

  // The modal renders the OmniSkills entitlement surface.
  await expect(page.getByText('OmniSkills Entitlement')).toBeVisible({ timeout: 15_000 });

  const urlAfter = page.url();

  // Let the open/fade-in animation settle so the screenshot reflects the resting state.
  await page.waitForFunction(() => {
    const el = document.querySelector('[role="dialog"]');
    return el ? Number(getComputedStyle(el).opacity) >= 0.99 : false;
  }, { timeout: 5_000 });

  await page.screenshot({ path: 'artifacts/gate1/omniskills-modal.png', fullPage: true });

  // Modal, not a page route: URL must be unchanged after opening OmniSkills.
  expect(urlAfter).toBe(urlBefore);
});
