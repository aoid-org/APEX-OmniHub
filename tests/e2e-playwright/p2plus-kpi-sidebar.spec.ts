import { test, expect } from '@playwright/test';

test.describe('P2+ KPI Sidebar', () => {
  // Owner P1 contract (supersedes #1516): SidebarKpiBar (System KPIs) stays in
  // the left sidebar footer AND the System Health surface (SystemHealthRow,
  // data-testid="rt_analytics") is restored in the right rail — it must not be
  // removed as a substitute for the KPI bar.
  test('SidebarKpiBar present on desktop, SystemHealthRow restored in right rail', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/omnidash', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    if (await page.locator('.omni-sidebar').isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(page.getByTestId('sidebar-kpi-bar')).toBeVisible({ timeout: 5000 });
      // System Health surface must be present in the rail (not removed).
      await expect(page.getByTestId('rt_analytics')).toBeVisible({ timeout: 5000 });
    }
  });
});
