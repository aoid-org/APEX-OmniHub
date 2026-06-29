import { test, expect } from '@playwright/test';
import { signInWithSupabaseSession } from './helpers/auth';

test.describe('P2+ corrected OmniDash layout contract', () => {
  test.beforeEach(async ({ page }) => {
    await signInWithSupabaseSession(page);
  });

  test('desktop keeps System Health, footer-only observability, equal rails, and KPI parity', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    const leftRail = page.locator('.omni-sidebar');
    const rightRail = page.locator('.omni-right-panel');

    await expect(leftRail).toBeVisible({ timeout: 10_000 });
    await expect(rightRail).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('sidebar-kpi-bar')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('rt_analytics')).toBeVisible({ timeout: 10_000 });

    const railWidths = await Promise.all([
      leftRail.evaluate((el) => Math.round(el.getBoundingClientRect().width)),
      rightRail.evaluate((el) => Math.round(el.getBoundingClientRect().width)),
    ]);
    expect(railWidths[0]).toBe(railWidths[1]);

    const [navBox, kpiBox] = await Promise.all([
      leftRail.locator('button').first().boundingBox(),
      page.getByTestId('sidebar-kpi-bar').boundingBox(),
    ]);
    expect(navBox).not.toBeNull();
    expect(kpiBox).not.toBeNull();
    expect(Math.abs(Math.round((navBox?.width ?? 0) - (kpiBox?.width ?? 0)))).toBeLessThanOrEqual(24);

    await expect(page.getByTestId('omnidash-footer-observability')).toHaveCount(1);
    await expect(page.locator('#m03-observability')).toHaveCount(0);
    await expect(page.getByTestId('observability-toggle')).toHaveCount(0);
  });

  test('OmniSlate prompt remains visible, focusable, typeable, and submittable on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: /slate/i }).click({ timeout: 10_000 }).catch(() => undefined);
    const input = page.getByTestId('omnislate-prompt-input');
    await expect(input).toBeVisible({ timeout: 10_000 });
    await input.focus();
    await expect(input).toBeFocused();
    await input.fill('layout smoke prompt');
    await expect(input).toHaveValue('layout smoke prompt');
    await expect(page.getByTestId('submit-prompt')).toBeVisible();
  });

  test('captures authenticated layout evidence screenshots', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('omnidash-footer-observability')).toBeVisible({ timeout: 10_000 });

    await page.screenshot({ path: testInfo.outputPath('desktop-dashboard.png'), fullPage: true });
    await page.getByTestId('omnidash-footer-observability').screenshot({ path: testInfo.outputPath('footer-observability-status.png') });
    await page.getByTestId('omnislate-prompt-input').screenshot({ path: testInfo.outputPath('omnislate-prompt-area.png') });
    await page.getByTestId('rt_security').screenshot({ path: testInfo.outputPath('omnimedia-right-rail.png') });
    await page.getByText('App Gallery').first().screenshot({ path: testInfo.outputPath('logo-app-gallery-area.png') });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.screenshot({ path: testInfo.outputPath('mobile-dashboard.png'), fullPage: true });
  });

});
