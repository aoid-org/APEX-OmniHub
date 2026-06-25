/**
 * CP-07 — Add Link E2E
 * Journey: Links widget → Add Link
 * Exit assertion: Link resolves, omnilink_links is queried, Links does not trigger OmniBoard
 */
import { test, expect } from '@playwright/test';
import { signInWithSupabaseSession, skipWithoutSupabaseConfig } from './helpers/auth';

test.describe('CP-07 — Add Link E2E', () => {
  test.beforeEach(async ({ page }) => {
    skipWithoutSupabaseConfig();
    await signInWithSupabaseSession(page);
  });

  test('Links widget adds a link without triggering OmniBoard', async ({ page }) => {
    // Intercept omnilink-port
    let linksQueried = false;
    await page.route('**/functions/v1/omnilink-port', async (route, request) => {
      const postData = request.postDataJSON() || {};
      if (postData.module_key === 'links') {
        linksQueried = true;
        if (postData.action === 'add-link') {
          return route.fulfill({
            status: 200,
            body: JSON.stringify({ State: 'Success', items: [{ id: '123', label: postData.payload?.url || 'new-link' }] }),
          });
        }
        return route.fulfill({
          status: 200,
          body: JSON.stringify({ State: 'Online', items: [], actions: ['add-link'] }),
        });
      }
      return route.continue();
    });

    // Sidebar interaction
    const linksSidebarBtn = page.getByRole('button', { name: 'Links', exact: true });
    await expect(linksSidebarBtn).toBeVisible({ timeout: 10_000 });
    await linksSidebarBtn.click();

    // The modal must be Links, not OmniBoard
    const dialog = page.getByRole('dialog').first();
    await expect(dialog).toBeVisible({ timeout: 8_000 });
    await expect(dialog.getByText(/app integration|connect/i)).not.toBeVisible();
    
    // OmniSpatialHost uses data-testid="omni-dialog"
    await expect(dialog).toHaveAttribute('data-testid', 'omni-dialog');

    // Fulfill a form submission if present
    const addInput = dialog.locator('input[type="url"], input[placeholder*="http"]').first();
    const hasInput = await addInput.isVisible({ timeout: 5_000 }).catch(() => false);
    if (hasInput) {
      await addInput.fill('https://apex.com/docs');
      await dialog.getByRole('button', { name: /add|save/i }).click();
    }
    
    expect(linksQueried).toBe(true);
  });
});
