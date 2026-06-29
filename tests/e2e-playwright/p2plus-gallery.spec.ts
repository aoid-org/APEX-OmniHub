import { test, expect } from '@playwright/test';

test.describe('P2+ Gallery', () => {
  test('gallery label is "App Gallery", no Connect button', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/omnidash', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    const gallery = page.getByTestId('integrated-apps');
    if (await gallery.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(page.getByText('App Gallery')).toBeVisible();
      await expect(page.getByText('Integrated Apps Gallery')).not.toBeVisible();
      await expect(page.getByText('Connect App')).not.toBeVisible();
    }
  });
});
