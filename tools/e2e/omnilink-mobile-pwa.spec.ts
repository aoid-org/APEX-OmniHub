import { test, expect, devices } from '@playwright/test';

// Mobile device configurations
const iPhone = devices['iPhone 13'];

test.describe('OmniLink Mobile PWA', () => {
  test.use(iPhone);

  test('should load homepage on mobile', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/OmniLink/);
  });

  test('should block desktop on authenticated routes', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/translation');
    await expect(page.locator('text=optimized for tablet and mobile')).toBeVisible();
  });

  test('should support PWA installation', async ({ page }) => {
    await page.goto('/');
    const manifestLink = await page.locator('link[rel="manifest"]');
    await expect(manifestLink).toHaveAttribute('href', '/manifest.webmanifest');
  });
});
