import { test, expect } from '@playwright/test';
import { signInWithSupabaseSession, skipWithoutSupabaseConfig } from './helpers/auth';

/**
 * Ops Widgets Smoke Test — Component Stability Gate
 *
 * Verifies the current OmniDash right-rail operational widgets render under a
 * real Supabase-authenticated browser session created from the provided Supabase keys.
 */
test.describe('Ops Widgets Smoke (Component Stability Gate)', () => {
  test.beforeEach(async ({ page }) => {
    skipWithoutSupabaseConfig();
    await signInWithSupabaseSession(page);
  });

  test('right-rail operational widgets render', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await expect(page.getByTestId('rt_security')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Security Audit')).toBeVisible({ timeout: 10000 });

    await expect(page.getByTestId('rt_analytics')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('System Health')).toBeVisible({ timeout: 10000 });

    await expect(page.getByTestId('rt_trace')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('OmniTrace')).toBeVisible({ timeout: 10000 });

    await expect(page.getByTestId('rt_ops')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Ops Controls')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Guardian Mode')).toBeVisible({ timeout: 10000 });

    const fatalErrors = consoleErrors.filter((error) =>
      /createContext|Cannot read properties of undefined|ChunkLoadError|Loading chunk|Failed to fetch dynamically imported module/.test(error),
    );
    expect(fatalErrors).toHaveLength(0);
  });
});
