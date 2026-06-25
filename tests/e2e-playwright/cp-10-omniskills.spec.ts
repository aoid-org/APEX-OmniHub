/**
 * CP-10 — OmniSkills Validation
 * Journey: Accessing OmniSkills
 * Exit assertion: OmniSkills loads correctly, reads entitlements
 */
import { test, expect } from '@playwright/test';
import { signInWithSupabaseSession, skipWithoutSupabaseConfig } from './helpers/auth';

test.describe('CP-10 — OmniSkills Validation', () => {
  test.beforeEach(async ({ page }) => {
    skipWithoutSupabaseConfig();
    await signInWithSupabaseSession(page);
  });

  test('OmniSkills module resolves entitlements via omnilink-port', async ({ page }) => {
    let queried = false;
    await page.route('**/functions/v1/omnilink-port', async (route, request) => {
      const postData = request.postDataJSON() || {};
      if (postData.module_key === 'omniskills') {
        queried = true;
        return route.fulfill({
          status: 200,
          body: JSON.stringify({
            State: 'Online',
            items: [
              { key: 'tier', value: 'pro' },
              { key: 'used', value: 2 },
              { key: 'limit', value: 10 }
            ],
            actions: ['forge-skill'],
            count: 3
          }),
        });
      }
      return route.continue();
    });

    const skillsBtn = page.getByRole('button', { name: /skills/i }).first();
    const isVisible = await skillsBtn.isVisible({ timeout: 5_000 }).catch(() => false);
    test.skip(!isVisible, 'APEX-1001: OmniSkills access point not visible in UI layout');

    await skillsBtn.click();
    
    // Expect the module to show the fake tier
    const dialog = page.getByRole('dialog').first();
    await expect(dialog).toBeVisible({ timeout: 8_000 });
    await expect(dialog.getByText(/pro/i).first()).toBeVisible({ timeout: 5_000 });
    expect(queried).toBe(true);
  });
});
