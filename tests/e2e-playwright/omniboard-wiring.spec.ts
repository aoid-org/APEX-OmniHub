import { test, expect } from '@playwright/test';
import { signInWithSupabaseSession, skipWithoutSupabaseConfig } from './helpers/auth';

test.describe('Connections surface wiring (two-owner canon)', () => {
  test.beforeEach(async ({ page }) => {
    skipWithoutSupabaseConfig();
    await signInWithSupabaseSession(page);
  });

  test('Connections widget splits Third-Party and Connected APEX Apps', async ({ page }) => {
    const appsWidget = page.getByTestId('widget_apps');
    await appsWidget.scrollIntoViewIfNeeded();
    await expect(appsWidget.getByText('Connections', { exact: true })).toBeVisible();
    await expect(appsWidget.getByTestId('connections-third-party')).toBeVisible();
    await expect(appsWidget.getByTestId('connections-apex-apps')).toBeVisible();
    // No legacy hardcoded picker / fake "Awaiting" tiles remain.
    await expect(appsWidget.getByRole('button', { name: /Awaiting/i })).toHaveCount(0);
  });

  test('Connect Third-Party App opens OmniBoard (App Integration)', async ({ page }) => {
    const appsWidget = page.getByTestId('widget_apps');
    await appsWidget.getByRole('button', { name: /connect third-party app/i }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5000 });
    await expect(dialog.getByText(/app integration|omniboard/i)).toBeVisible();
    await expect(page).toHaveURL(/\/omnidash/);
  });

  test('Add APEX App (Connections) opens the APEX Apps MCP modal, not OmniBoard', async ({ page }) => {
    const appsWidget = page.getByTestId('widget_apps');
    await appsWidget.getByRole('button', { name: /add apex app/i }).click();
    await expect(page.getByTestId('apex-apps-mcp')).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId('apex-apps-prompt-input')).toBeVisible();
  });
});
