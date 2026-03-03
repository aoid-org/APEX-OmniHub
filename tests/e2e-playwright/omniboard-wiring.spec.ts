import { test, expect } from '@playwright/test';

test.describe('OmniBoard Modal Integration Wiring', () => {
  test('clicking an unconnected integration triggers the OmniModal', async ({ page }) => {
    // ARRANGE: Navigate to the Dashboard Overview
    await page.goto('/omnidash', { waitUntil: 'networkidle' });

    // Ensure the integration apps are loaded
    const appsHeader = page.getByText('Integrated Apps');
    await expect(appsHeader).toBeVisible();

    // ACT: Click on a "Partial" or "NEEDS_AUTH" app (e.g., NetSuite - status Partial)
    // Find the tile containing 'NetSuite'
    const netSuiteTile = page.locator('.apps-hex > div > div').filter({ hasText: 'NetSuite' });
    await expect(netSuiteTile).toBeVisible();
    
    // Click the tile
    await netSuiteTile.click();

    // ASSERT: Verify the OmniModal is invoked and visible
    // The modal uses the shadcn Dialog primitive
    const modalDialog = page.getByRole('dialog');
    await expect(modalDialog).toBeVisible({ timeout: 5000 });

    // Specifically check for the Authentication title
    const modalTitle = modalDialog.getByText('NetSuite Authentication');
    await expect(modalTitle).toBeVisible();
    
    // Verify it didn't navigate away (OmniPort is the /omniport route)
    expect(page.url()).not.toContain('/omniport');
  });

  test('clicking a live integration navigates to OmniPort', async ({ page }) => {
    // ARRANGE: Navigate to Dashboard Overview
    await page.goto('/omnidash', { waitUntil: 'networkidle' });

    // ACT: Click a "Live" app (e.g., Salesforce)
    const salesforceTile = page.locator('.apps-hex > div > div').filter({ hasText: 'Salesforce' });
    await expect(salesforceTile).toBeVisible();
    
    await salesforceTile.click();

    // ASSERT: Verify navigation to /omniport
    await expect(page).toHaveURL(/\/omnidash\/omniport/);
  });
});
