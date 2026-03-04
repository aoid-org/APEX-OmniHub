import { test, expect } from '@playwright/test';

test.describe('OmniBoard Modal Integration Wiring', () => {
  test('clicking an unconnected integration triggers the OmniModal', async ({ page }) => {
    // ARRANGE: Navigate to the Dashboard Overview
    await page.goto('/omnidash', { waitUntil: 'networkidle' });

    // Ensure the integration apps section is loaded
    const appsHeader = page.getByText('Integrated Apps');
    await expect(appsHeader).toBeVisible();

    // ACT: Click on a "Partial" app (Orchestrator has status: 'Partial' in APP_REGISTRY)
    const partialTile = page.locator('.apps-hex > div > div').filter({ hasText: 'Orchestrator' });
    await expect(partialTile).toBeVisible();

    await partialTile.click();

    // ASSERT: Verify the OmniModal is invoked and visible
    const modalDialog = page.getByRole('dialog');
    await expect(modalDialog).toBeVisible({ timeout: 5000 });

    // Check for the Authentication title matching the app name
    const modalTitle = modalDialog.getByText('Orchestrator Authentication');
    await expect(modalTitle).toBeVisible();

    // Verify it didn't navigate away
    expect(page.url()).not.toContain('/omniport');
  });

  test('clicking a live integration navigates to OmniPort', async ({ page }) => {
    // ARRANGE: Navigate to Dashboard Overview
    await page.goto('/omnidash', { waitUntil: 'networkidle' });

    // ACT: Click a "Live" app (OmniBoard has status: 'Live' in APP_REGISTRY)
    const liveTile = page.locator('.apps-hex > div > div').filter({ hasText: 'OmniBoard' });
    await expect(liveTile).toBeVisible();

    await liveTile.click();

    // ASSERT: Verify navigation to /omniport
    await expect(page).toHaveURL(/\/omnidash\/omniport/);
  });
});
