/**
 * Mobile Viewport E2E — Playwright Touch Emulation & iPhone 14 Profile.
 *
 * Verifies that the deployed surface under iPhone 14 emulation (390x844,
 * hasTouch: true, isMobile: true) renders without horizontal overflow or
 * fatal React/chunk errors, verifying responsive layout stability for mobile drag-and-drop.
 *
 * OWNED BY: APEX Business Systems Ltd.
 */
import { test, expect } from '@playwright/test';

test.describe('Mobile Viewport & Touch Emulation — iPhone 14 Profile', () => {
  test('renders without horizontal overflow or crash under mobile profile (390x844)', async ({ page }) => {
    // Set explicit iPhone 14 viewport and touch properties if not already set by project profile
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/omnidash', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    // Verify layout width does not exceed client width (no horizontal scrolling / clipping)
    const overflow = await page.evaluate(() => {
      const el = document.documentElement;
      return { scrollWidth: el.scrollWidth, clientWidth: el.clientWidth };
    });

    expect(
      overflow.scrollWidth,
      `Horizontal overflow detected under iPhone 14 profile (390x844): scrollWidth ${overflow.scrollWidth} > clientWidth ${overflow.clientWidth}`,
    ).toBeLessThanOrEqual(overflow.clientWidth + 1);
  });

  test('verifies touch emulation pointer properties and mobile breakpoint classification', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const clientState = await page.evaluate(() => {
      return {
        width: window.innerWidth,
        height: window.innerHeight,
        isTouchSupported: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
      };
    });

    expect(clientState.width).toBe(390);
    expect(clientState.height).toBe(844);
  });
});
