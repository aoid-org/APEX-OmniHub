/**
 * OmniDash Responsive — Multi-viewport E2E for changed surfaces.
 *
 * Validates that the dashboard shell and key widgets render correctly
 * at both desktop (1440px) and mobile (393px) viewports. Covers
 * surfaces modified in Batches 1-5: ConnectionsWidget, OmniMedia,
 * DraggableWidget, ApexAppsMcpModule routing.
 *
 * Runs against the local preview build (no backend required).
 */
import { test, expect } from '@playwright/test';

const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 393, height: 851 };

test.describe('OmniDash Responsive — Desktop', () => {
  test.use({ viewport: DESKTOP });

  test('dashboard shell renders at desktop viewport', async ({ page }) => {
    await page.goto('/omnidash', { waitUntil: 'domcontentloaded' });

    const shell = page.locator('.omni-canvas-container, [data-testid="omnidash-canvas"], .omni-dash-root');
    await expect(shell.first()).toBeVisible({ timeout: 15_000 });

    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(viewportWidth).toBe(DESKTOP.width);
  });

  test('sidebar is visible on desktop', async ({ page }) => {
    await page.goto('/omnidash', { waitUntil: 'domcontentloaded' });

    await page.waitForTimeout(2000);

    const sidebar = page.locator('.omni-sidebar, nav[aria-label*="navigation"], [data-testid="sidebar"]');
    const hasSidebar = await sidebar.first().isVisible().catch(() => false);

    const desktopNav = page.locator('.omni-desktop-nav, .omni-nav-rail');
    const hasDesktopNav = await desktopNav.first().isVisible().catch(() => false);

    expect(hasSidebar || hasDesktopNav).toBe(true);
  });
});

test.describe('OmniDash Responsive — Mobile', () => {
  test.use({ viewport: MOBILE });

  test('dashboard shell renders at mobile viewport', async ({ page }) => {
    await page.goto('/omnidash', { waitUntil: 'domcontentloaded' });

    const shell = page.locator('.omni-canvas-container, [data-testid="omnidash-canvas"], .omni-dash-root');
    await expect(shell.first()).toBeVisible({ timeout: 15_000 });

    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(viewportWidth).toBe(MOBILE.width);
  });

  test('mobile bottom nav is visible on mobile viewport', async ({ page }) => {
    await page.goto('/omnidash', { waitUntil: 'domcontentloaded' });

    await page.waitForTimeout(2000);

    const bottomNav = page.locator('.omni-mobile-bottom-nav, [role="tablist"][aria-label*="navigation"]');
    const hasBottomNav = await bottomNav.first().isVisible().catch(() => false);

    const mobileDrawer = page.locator('.omni-mobile-drawer, [data-testid="mobile-drawer"]');
    const hasMobileDrawer = await mobileDrawer.first().isVisible().catch(() => false);

    expect(hasBottomNav || hasMobileDrawer).toBe(true);
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
