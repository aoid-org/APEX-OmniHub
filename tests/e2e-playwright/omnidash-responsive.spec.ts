/**
 * OmniDash Responsive — Multi-viewport E2E for changed surfaces.
 *
 * Validates the app renders without fatal errors and without horizontal
 * overflow across the post-1511 viewport matrix: desktop (1440), narrow
 * desktop (1280), tablet (1024), mobile (393).
 *
 * The /omnidash route requires auth; unauthenticated requests redirect to
 * /login. The no-overflow / no-crash checks apply to whatever the server
 * renders (login or dashboard) — both must be responsive. Dashboard-specific
 * structural assertions live in the vitest guardrail
 * (tests/omnidash/responsive-layout-guardrail.spec.tsx), which renders the
 * authenticated shell directly without a browser session.
 */
import { test, expect } from '@playwright/test';

const VIEWPORTS = [
  { name: 'desktop-1440', width: 1440, height: 900 },
  { name: 'narrow-desktop-1280', width: 1280, height: 800 },
  { name: 'tablet-1024', width: 1024, height: 768 },
  { name: 'mobile-393', width: 393, height: 851 },
] as const;

test.describe('OmniDash Responsive — no horizontal overflow', () => {
  for (const vp of VIEWPORTS) {
    test(`no horizontal overflow at ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/omnidash', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1500);

      const overflow = await page.evaluate(() => {
        const el = document.documentElement;
        return { scrollWidth: el.scrollWidth, clientWidth: el.clientWidth };
      });

      // Allow a 1px sub-pixel rounding tolerance.
      expect(
        overflow.scrollWidth,
        `Horizontal overflow at ${vp.name}: scrollWidth ${overflow.scrollWidth} > clientWidth ${overflow.clientWidth}`,
      ).toBeLessThanOrEqual(overflow.clientWidth + 1);
    });
  }
});

test.describe('OmniDash Responsive — no fatal errors', () => {
  for (const vp of VIEWPORTS) {
    test(`no chunk-load or React errors at ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });

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
      await page.waitForTimeout(2500);

      expect(fatalErrors, `Fatal errors at ${vp.name}:\n${fatalErrors.join('\n')}`).toHaveLength(0);
    });
  }
});

test.describe('OmniDash Responsive — touch targets', () => {
  test.use({ viewport: { width: 393, height: 851 } });

  test('mobile nav touch targets meet 44px minimum', async ({ page }) => {
    await page.goto('/omnidash', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    const buttons = page.locator('.omni-mobile-bottom-nav button, .omni-mobile-tab');
    const count = await buttons.count();

    for (let i = 0; i < count; i++) {
      const box = await buttons.nth(i).boundingBox();
      if (box) {
        expect(box.height, `Mobile nav button ${i} height should be >= 44px`).toBeGreaterThanOrEqual(44);
      }
    }
  });
});
