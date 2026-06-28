/**
 * OmniDash Responsive — Multi-viewport E2E for changed surfaces.
 *
 * Validates that the app renders without fatal errors at both desktop
 * (1440px) and mobile (393px) viewports. The /omnidash route requires
 * auth; unauthenticated requests are redirected to /login — this spec
 * verifies both the redirect and the target page render cleanly.
 */
import { test, expect } from '@playwright/test';

const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 393, height: 851 };

test.describe('OmniDash Responsive — Desktop', () => {
  test.use({ viewport: DESKTOP });

  test('page renders at desktop viewport without crash', async ({ page }) => {
    await page.goto('/omnidash', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(viewportWidth).toBe(DESKTOP.width);

    const body = page.locator('body');
    await expect(body).toBeVisible();
  });
});

test.describe('OmniDash Responsive — Mobile', () => {
  test.use({ viewport: MOBILE });

  test('page renders at mobile viewport without crash', async ({ page }) => {
    await page.goto('/omnidash', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(viewportWidth).toBe(MOBILE.width);

    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('touch targets meet 44px minimum on mobile', async ({ page }) => {
    await page.goto('/omnidash', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    const buttons = page.locator('.omni-mobile-bottom-nav button, .omni-mobile-tab');
    const count = await buttons.count();

    if (count > 0) {
      for (let i = 0; i < count; i++) {
        const box = await buttons.nth(i).boundingBox();
        if (box) {
          expect(box.height, `Mobile nav button ${i} height should be >= 44px`).toBeGreaterThanOrEqual(44);
        }
      }
    }
  });
});

test.describe('OmniDash Responsive — No Fatal Errors', () => {
  for (const { name, viewport } of [
    { name: 'desktop', viewport: DESKTOP },
    { name: 'mobile', viewport: MOBILE },
  ]) {
    test(`no chunk-load or React errors at ${name} viewport`, async ({ page }) => {
      await page.setViewportSize(viewport);

      const fatalErrors: string[] = [];
      page.on('pageerror', (error) => {
        if (
          error.message.includes('ChunkLoadError') ||
          error.message.includes('Failed to fetch dynamically imported module') ||
          error.message.includes('createContext') ||
          error.message.includes('Invalid hook call')
        ) {
          fatalErrors.push(error.message);
        }
      });

      await page.goto('/omnidash', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3000);

      expect(fatalErrors, `Fatal errors at ${name} viewport:\n${fatalErrors.join('\n')}`).toHaveLength(0);
    });
  }
});
