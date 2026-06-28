/**
 * OmniDash Modal Contract (Batch 1 — contract §2 Modal Law + §1/§3 routing).
 *
 * Proves ordinary OmniDash modals obey the Modal Law:
 *   - exactly ONE close button in the dialog chrome
 *   - role="dialog" + aria-modal present
 *   - Escape CLOSES (not minimize)
 *   - backdrop click CLOSES
 *   - focus returns to the opener on close
 * and that "Add APEX App" opens the APEX Apps MCP modal — never OmniBoard.
 *
 * Render-smoke mode (default test:e2e, no backend) self-skips via
 * skipWithoutSupabaseConfig(); CI backend mode runs the assertions for real.
 */
import { test, expect } from '@playwright/test';
import { signInWithSupabaseSession, skipWithoutSupabaseConfig } from './helpers/auth';

async function openApexAppsModal(page: import('@playwright/test').Page) {
  const addBtn = page.getByRole('button', { name: /add apex app/i }).first();
  await expect(addBtn, 'Add APEX App CTA must be present on OmniDash').toBeVisible({ timeout: 10_000 });
  await addBtn.focus();
  await addBtn.click();
  return addBtn;
}

test.describe('OmniDash Modal Contract', () => {
  test.beforeEach(async ({ page }) => {
    skipWithoutSupabaseConfig();
    await signInWithSupabaseSession(page);
  });

  test('Add APEX App opens the APEX Apps MCP modal, not OmniBoard', async ({ page }) => {
    await openApexAppsModal(page);

    const dialog = page.getByTestId('omni-dialog').or(page.getByRole('dialog')).first();
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    // It is the first-party APEX Apps MCP surface…
    await expect(page.getByTestId('apex-apps-mcp')).toBeVisible();
    await expect(page.getByTestId('apex-apps-prompt-input')).toBeVisible();
    // …and NOT the OmniBoard third-party wizard.
    await expect(dialog.getByText(/oauth|authorize|provider connection/i)).toHaveCount(0);
  });

  test('dialog exposes exactly one close button with accessible role', async ({ page }) => {
    await openApexAppsModal(page);
    const dialog = page.getByTestId('omni-dialog').first();
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute('aria-modal', 'true');

    const closeButtons = dialog.getByRole('button', { name: /^close$/i });
    await expect(
      closeButtons,
      'Modal Law: ordinary modals must have exactly ONE close control',
    ).toHaveCount(1);
  });

  test('Escape closes the modal', async ({ page }) => {
    await openApexAppsModal(page);
    const dialog = page.getByTestId('omni-dialog').first();
    await expect(dialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog, 'Escape must close (not minimize) the modal').toBeHidden({ timeout: 5_000 });
    // No minimized dock chip should remain (close, not minimize).
    await expect(page.getByRole('button', { name: /^restore /i })).toHaveCount(0);
  });

  test('backdrop click closes the modal', async ({ page }) => {
    await openApexAppsModal(page);
    const dialog = page.getByTestId('omni-dialog').first();
    await expect(dialog).toBeVisible();
    await page.getByRole('button', { name: /close modal/i }).click({ position: { x: 5, y: 5 } });
    await expect(dialog, 'Backdrop click must close the modal').toBeHidden({ timeout: 5_000 });
  });

  test('focus returns to the opener after close', async ({ page }) => {
    const opener = await openApexAppsModal(page);
    const dialog = page.getByTestId('omni-dialog').first();
    await expect(dialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden({ timeout: 5_000 });
    await expect(opener, 'Focus must return to the opener element on close').toBeFocused();
  });
});
