import { expect, type Page, type Locator } from '@playwright/test';

/**
 * APEX-OmniHub: Test Integrity Doctrine (R5)
 * BANS generic `.toBeVisible()` checks on `.omni-dialog` alone.
 * 
 * Verifies that exactly one modal is present, and asserts its identity
 * using a regex discriminator (e.g., its title or primary CTA).
 */
export async function assertModalIdentityAndIsolation(
  page: Page,
  discriminatorPattern: RegExp | string,
): Promise<Locator> {
  // 1. Locate the dialog
  const dialog = page.getByTestId('omni-dialog').or(page.getByRole('dialog')).first();
  await expect(dialog).toBeVisible({ timeout: 5000 });

  // 2. Isolation Check: Ensure no overlapping or z-index stacked modals
  const dialogCount = await page.getByTestId('omni-dialog').or(page.getByRole('dialog')).count();
  expect(dialogCount, 'Multiple modals detected. Expected strict modal isolation.').toBe(1);

  // 3. Identity Check: Ensure this is the correct modal type, not a generic fallback
  await expect(
    dialog.getByText(discriminatorPattern).first()
  ).toBeVisible({ timeout: 5000 });

  return dialog;
}
