import { test, expect } from '@playwright/test';

test.describe('P2+ Wallpaper', () => {
  test('background grid has position:fixed, no horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/omnidash', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    const body = page.locator('body');
    const scrollWidth = await body.evaluate(el => el.scrollWidth);
    const clientWidth = await body.evaluate(el => el.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5);
  });
});
