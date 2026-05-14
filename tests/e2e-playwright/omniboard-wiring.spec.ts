import { test, expect } from '@playwright/test';
import { signInWithSupabaseSession, skipWithoutSupabaseConfig } from './helpers/auth';

test.describe('OmniBoard Modal Integration Wiring', () => {
  test.beforeEach(async ({ page }) => {
    skipWithoutSupabaseConfig();
    await signInWithSupabaseSession(page);
  });

  test('clicking an unconnected integration opens the Connect Integration modal', async ({ page }) => {
    const appsHeader = page.getByText('Integrated Apps');
    await appsHeader.scrollIntoViewIfNeeded();
    await expect(appsHeader).toBeVisible();

    const appsWidget = page.getByTestId('widget_apps');
    const awaitingTile = appsWidget.getByRole('button', { name: /Awaiting/i }).first();
    await expect(awaitingTile).toBeVisible();

    await awaitingTile.click();

    const modalDialog = page.getByRole('dialog');
    await expect(modalDialog).toBeVisible({ timeout: 5000 });
    await expect(modalDialog.getByText('Connect Integration')).toBeVisible();
    await expect(modalDialog.getByText('Choose a third-party application')).toBeVisible();
    await expect(page).toHaveURL(/\/omnidash/);
  });

  test('clicking Add APEX App opens the Connect APEX App modal without route drift', async ({ page }) => {
    const ecosystemWidget = page.getByTestId('widget_eco');
    const addAppButton = ecosystemWidget.getByRole('button', { name: /Add APEX App/i });
    await expect(addAppButton).toBeVisible();

    await addAppButton.click();

    const modalDialog = page.getByRole('dialog');
    await expect(modalDialog).toBeVisible({ timeout: 5000 });
    await expect(modalDialog.getByText('Connect APEX App')).toBeVisible();
    await expect(modalDialog.getByText('Select an APEX module')).toBeVisible();
    await expect(page).toHaveURL(/\/omnidash/);
  });
});
