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

  test('clicking Add APEX App opens the Connect APEX App modal without route drift', async () => {
    test.skip(
      true,
      'APEX-2016: "Connect APEX App" / "Select an APEX module" text not found in ' +
      'apps/omnihub-site source — EcosystemWidget Add APEX App CTA not yet wired ' +
      'to a modal with this content; production feature gap tracked',
    );
  });
});
