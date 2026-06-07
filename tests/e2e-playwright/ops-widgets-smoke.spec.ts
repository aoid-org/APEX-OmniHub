import { test, expect } from '@playwright/test';
import { signInWithSupabaseSession, skipWithoutSupabaseConfig } from './helpers/auth';

/**
 * Ops Widgets Smoke Test — Component Stability Gate
 *
 * Verifies the OmniDash operational panels (Security/Analytics/OmniTrace/Ops)
 * render under a real Supabase-authenticated session. OmniDashShell renders these
 * as a desktop right-rail (`{isDesktop && ...}` with data-testid widgets) and, on
 * mobile/tablet, inside the "Open insights panel" drawer — so the assertion path is
 * viewport-aware to match the actual responsive contract.
 */
test.describe('Ops Widgets Smoke (Component Stability Gate)', () => {
  test.beforeEach(async ({ page }) => {
    skipWithoutSupabaseConfig();
    await signInWithSupabaseSession(page);
  });

  test('operational panels render (desktop right-rail or mobile insights drawer)', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Desktop shows the right-rail widgets (by data-testid); mobile/tablet relocate the
    // same panels into the insights drawer, which must be opened first.
    const rightRail = page.getByTestId('rt_security');
    const isDesktopLayout = await rightRail.isVisible({ timeout: 10000 }).catch(() => false);

    if (!isDesktopLayout) {
      await page.getByRole('button', { name: 'Open insights panel' }).click();
    }

    await expect(page.getByText('Security Audit')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('System Health')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('OmniTrace').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Ops Controls')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Guardian Mode')).toBeVisible({ timeout: 10000 });

    if (isDesktopLayout) {
      await expect(page.locator('.sentinel-section').filter({ hasText: 'Ops Controls' })).toBeVisible();
    }

    const fatalErrors = consoleErrors.filter((error) =>
      /createContext|Cannot read properties of undefined|ChunkLoadError|Loading chunk|Failed to fetch dynamically imported module/.test(error),
    );
    expect(fatalErrors).toHaveLength(0);
  });
});
