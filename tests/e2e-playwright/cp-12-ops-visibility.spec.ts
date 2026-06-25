/**
 * CP-12 — Ops Data Visibility (Regression Guard)
 * Exit assertion: All 4 data-testids (rt_security, rt_trace, rt_analytics, rt_ops) exist
 * and no mock placeholders are rendered within them.
 */
import { test, expect } from '@playwright/test';
import { signInWithSupabaseSession, skipWithoutSupabaseConfig } from './helpers/auth';

const MOCK_PATTERNS = [
  /lorem ipsum/i,
  /placeholder/i,
  /mock data/i,
];

test.describe('CP-12 — Ops Data Visibility', () => {
  test.beforeEach(async ({ page }) => {
    skipWithoutSupabaseConfig();
    await signInWithSupabaseSession(page);
  });

  test('Ops widgets render with correct testids and no mock data', async ({ page }) => {
    const isDesktop = await page.locator('.omni-sidebar').isVisible({ timeout: 6_000 }).catch(() => false);
    test.skip(!isDesktop, 'APEX-1001: Ops widgets typically bound to desktop layout right-rail');

    const opsPanels = [
      'rt_security',
      'rt_trace',
      'rt_analytics',
      'rt_ops'
    ];

    for (const testid of opsPanels) {
      const panel = page.getByTestId(testid).first();
      await expect(panel).toBeVisible({ timeout: 15_000 });
      
      const text = await panel.innerText();
      for (const pattern of MOCK_PATTERNS) {
        expect(pattern.test(text), `Mock drift detected in ${testid}: ${text}`).toBe(false);
      }
    }
  });
});
