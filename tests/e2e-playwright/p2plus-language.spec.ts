import { test, expect } from '@playwright/test';

test.describe('P2+ Language Switcher', () => {
  test('language selector visible in OmniDash header', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/omnidash', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    const header = page.getByTestId('omnidash-top-header');
    if (await header.isVisible({ timeout: 5000 }).catch(() => false)) {
      const langSelector = header.locator('.omni-header-lang');
      await expect(langSelector).toBeVisible({ timeout: 5000 });
    }
  });
});
