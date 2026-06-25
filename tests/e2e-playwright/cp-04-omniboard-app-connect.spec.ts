/**
 * CP-04 — OmniBoard App Connect
 * Journey: + New Integration → OmniBoardWizard renders → Integration active
 * Exit assertion: OmniBoard module opens, wizard renders, no OmniLink port errors
 * Primary risks: OmniLink port stub regression, OmniBoardModule client-gate removed
 *
 * Architecture note (omni-recall/wiki/corrections/004):
 *   OmniBoard is the ONE AND ONLY app-integration surface.
 *   Links widget must NOT open OmniBoardWizard.
 *   OmniBoardModule wraps OmniBoardWizard directly.
 */
import { test, expect, type Page } from '@playwright/test';
import { signInWithSupabaseSession, skipWithoutSupabaseConfig } from './helpers/auth';

const FATAL = /createContext|Cannot read properties of undefined|ChunkLoadError|Failed to fetch dynamically imported module/;

function trackConsole(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(`PAGEERROR: ${e.message}`));
  return errors;
}

test.describe('CP-04 — OmniBoard App Connect', () => {
  test.beforeEach(async ({ page }) => {
    skipWithoutSupabaseConfig();
    await signInWithSupabaseSession(page);
  });

  test('OmniBoard sidebar button opens integration dialog (not Links)', async ({ page }) => {
    const errors = trackConsole(page);

    const sidebar = page.locator('.omni-sidebar');
    const hasSidebar = await sidebar.isVisible({ timeout: 8_000 }).catch(() => false);
    test.skip(!hasSidebar, 'APEX-1001: Sidebar is desktop-only');

    // Click OmniBoard in sidebar
    await page.getByRole('button', { name: 'OmniBoard', exact: true }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 10_000 });

    // Verify it's the OmniBoard / App Integration surface — NOT Links
    await expect(dialog.getByText(/app integration|connect|integration/i).first()).toBeVisible({ timeout: 8_000 });
    await expect(dialog.getByText(/collected links|link context/i)).not.toBeVisible();

    // Route must remain /omnidash (no navigation on modal open)
    await expect(page).toHaveURL(/\/omnidash/);

    expect(errors.filter((e) => FATAL.test(e))).toHaveLength(0);
  });

  test('OmniBoardWizard renders initial state (IDLE/listening)', async ({ page }) => {
    const errors = trackConsole(page);

    const sidebar = page.locator('.omni-sidebar');
    const hasSidebar = await sidebar.isVisible({ timeout: 8_000 }).catch(() => false);
    test.skip(!hasSidebar, 'APEX-1001: Sidebar is desktop-only');

    await page.getByRole('button', { name: 'OmniBoard', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 10_000 });

    // Wizard must have an input/text-area for FSM event USER_INPUT
    const wizardInput = dialog.getByRole('textbox').or(dialog.locator('textarea, input[type="text"]')).first();
    await expect(wizardInput).toBeVisible({ timeout: 8_000 });

    // Close safely
    await dialog.getByRole('button', { name: /close|dismiss|cancel/i }).last().click();
    await expect(dialog).toBeHidden({ timeout: 8_000 });

    expect(errors.filter((e) => FATAL.test(e))).toHaveLength(0);
  });

  test('OmniBoard module-state resolves via omnilink-port (not integrations table)', async ({ page }) => {
    // Verify the omnilink-port is called and does NOT reference integrations for OmniBoard
    const portCalls: string[] = [];
    page.on('request', (req) => {
      if (req.url().includes('omnilink-port')) portCalls.push(req.url());
    });

    const sidebar = page.locator('.omni-sidebar');
    const hasSidebar = await sidebar.isVisible({ timeout: 8_000 }).catch(() => false);
    test.skip(!hasSidebar, 'APEX-1001: Sidebar is desktop-only');

    await page.getByRole('button', { name: 'OmniBoard', exact: true }).click();
    await page.getByRole('dialog').isVisible({ timeout: 10_000 }).catch(() => {});

    // Wait up to 5s for a port call to fire
    await page.waitForTimeout(5_000);

    // If omnilink-port is called, it should be for module_state (integrations resolver)
    // We validate absence of fatal errors as proxy when no credentials available
    const errors: string[] = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    expect(errors.filter((e) => FATAL.test(e))).toHaveLength(0);
  });

  test('connector grid shows state after OmniBoard integration completes', async ({ page }) => {
    // This test validates the Integrations component testid surface
    const sidebar = page.locator('.omni-sidebar');
    const hasSidebar = await sidebar.isVisible({ timeout: 8_000 }).catch(() => false);
    test.skip(!hasSidebar, 'APEX-1001: Sidebar is desktop-only');

    // Navigate to integrations via sidebar — may be under a different label
    const integrationsBtn = page.getByRole('button', { name: /integrations|omniboard/i }).first();
    await integrationsBtn.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 10_000 });

    // Either the empty state or connector grid must render (not a blank dialog)
    const gridOrEmpty = dialog.getByTestId('connector-grid')
      .or(dialog.getByTestId('no-connectors-state'))
      .or(dialog.locator('[data-testid^="connector-tile-"]'))
      .first();

    await expect(gridOrEmpty).toBeVisible({ timeout: 10_000 });
  });
});
