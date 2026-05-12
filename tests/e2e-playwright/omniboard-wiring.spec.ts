import { test, expect } from '@playwright/test';

const isCI = !!process.env.CI;

test.describe('OmniDash App Modal Flow Integration', () => {
  test.skip(isCI, 'Requires authenticated session unavailable in CI preview');

  test.beforeEach(async ({ page }) => {
    // Attempt login bypass for tests by setting local storage directly on base route
    await page.goto('/');
    await page.evaluate(() => {
        window.localStorage.setItem('demo_mode_override', 'true');
    });
    // Add small timeout to ensure localStorage propagates
    await page.waitForTimeout(500);
  });

  test('clicking an unconnected integration triggers the OmniModal for selection', async ({ page }) => {
    await page.goto('/omnidash?demo=true', { waitUntil: 'networkidle' });
    await expect(page).toHaveURL(/\/omnidash/);

    const appsHeader = page.getByText('Integrated Apps');
    await appsHeader.scrollIntoViewIfNeeded();
    await expect(appsHeader).toBeVisible();

    const appsSection = page.locator('.omni-grid-apps');

    // In OmniDashShell, the placeholders say "Awaiting"
    const partialTile = appsSection.locator('button').filter({ hasText: 'Awaiting' });
    await expect(partialTile.first()).toBeVisible();

    await partialTile.first().click();

    // Verify the OmniModal is invoked and visible
    const modalDialog = page.getByRole('dialog');
    await expect(modalDialog).toBeVisible({ timeout: 5000 });

    // Check for the modal title matching the interaction
    const modalTitle = modalDialog.getByText('Connect Integration');
    await expect(modalTitle).toBeVisible();

    // Verify it didn't navigate away
    expect(page.url()).not.toContain('omniport');
  });
});
