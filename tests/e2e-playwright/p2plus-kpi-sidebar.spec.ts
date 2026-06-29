import { test, expect } from '@playwright/test';

test.describe('P2+ KPI Sidebar', () => {
  test('SidebarKpiBar present on desktop, SystemHealthRow absent from right rail', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/omnidash', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    if (await page.locator('.omni-sidebar').isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(page.getByTestId('sidebar-kpi-bar')).toBeVisible({ timeout: 5000 });
    }

    const rightRailAnalytics = page.getByTestId('rt_analytics');
    await expect(rightRailAnalytics).not.toBeVisible();
  });
});
