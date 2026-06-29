import { test, expect } from '@playwright/test';

const VIEWPORTS = [
  { name: 'mobile-390', width: 390, height: 844 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'laptop-1280', width: 1280, height: 800 },
  { name: 'desktop-1440', width: 1440, height: 900 },
  { name: 'ultrawide-1920', width: 1920, height: 1080 },
];

test.describe('P2+ Layout — viewport matrix', () => {
  for (const vp of VIEWPORTS) {
    test(`renders without crash at ${vp.name} (${vp.width}×${vp.height})`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/omnidash', { waitUntil: 'domcontentloaded' });
      await expect(page.locator('body')).toBeVisible({ timeout: 10_000 });
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await page.waitForTimeout(2000);
      const fatal = errors.filter(e => /ChunkLoadError|Cannot read properties of undefined/.test(e));
      expect(fatal).toHaveLength(0);
    });
  }
});
