/**
 * CP-15 — A11y (Axe Core)
 * Gate: WCAG 2.2 AA (0 violations)
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { signInWithSupabaseSession, skipWithoutSupabaseConfig } from './helpers/auth';

test.describe('CP-15 — Accessibility (Axe)', () => {
  test.beforeEach(async ({ page }) => {
    skipWithoutSupabaseConfig();
    await signInWithSupabaseSession(page);
  });

  test('OmniDash should not have any automatically detectable accessibility issues', async ({ page }) => {
    // Wait for main dashboard rendering
    await page.waitForSelector('.omni-dashboard-container', { timeout: 10000 }).catch(() => {});
    
    // Scan page
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
      .analyze();
      
    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
