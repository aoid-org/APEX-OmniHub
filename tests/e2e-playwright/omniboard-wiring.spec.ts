import { test, expect } from '@playwright/test';

test.describe('OmniBoard Modal Integration Wiring', () => {
  test('clicking an unconnected integration triggers the OmniModal', async ({ page }) => {
    // ARRANGE: Navigate to the Dashboard Overview
    await page.goto('/omnidash', { waitUntil: 'networkidle' });

    // Scroll to the Integrated Apps section (below the hero tri-pane)
    const appsSection = page.locator('.apps-hex');
    await appsSection.scrollIntoViewIfNeeded();

    // Ensure the integration apps section is loaded
    const appsHeader = page.getByText('Integrated Apps');
    await expect(appsHeader).toBeVisible();

    // ACT: Click on a "Partial" app (Orchestrator has status: 'Partial' in APP_REGISTRY)
    const partialTile = appsSection.locator('div').filter({ hasText: /^Orchestrator/ });
    await expect(partialTile.first()).toBeVisible();

    await partialTile.first().click();

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

    // Scroll to the Integrated Apps section
    const appsSection = page.locator('.apps-hex');
    await appsSection.scrollIntoViewIfNeeded();

    // ACT: Click a "Live" app (OmniBoard has status: 'Live' in APP_REGISTRY)
    const liveTile = appsSection.locator('div').filter({ hasText: /^OmniBoard/ });
    await expect(liveTile.first()).toBeVisible();

    await liveTile.first().click();

    // ASSERT: Verify navigation to /omniport
    await expect(page).toHaveURL(/\/omnidash\/omniport/);
  });
});
