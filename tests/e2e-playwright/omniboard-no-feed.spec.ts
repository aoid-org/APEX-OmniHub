import { test, expect } from '@playwright/test';
import { skipWithoutSupabaseConfig, signInWithSupabaseSession } from './helpers/auth';

test.describe('OmniDash Antigravity 2.0 Directive Enforcement', () => {
  test.beforeEach(async ({ page }) => {
    skipWithoutSupabaseConfig();
    await signInWithSupabaseSession(page);
  });

  test('OmniBoard Feed terminal widget should not exist in the DOM', async ({ page }) => {

    // Navigate to OmniDash
    await page.goto('/omnidash');
    
    // Wait for the shell to be fully mounted
    try {
        await page.waitForSelector('.omni-shell-main', { state: 'attached', timeout: 5000 });
    } catch (e) {
        console.error("DOM at timeout:", await page.content());
        throw e;
    }

    // Assert that the right panel OmniBoard Feed container does not exist
    const feedContainer = page.locator('#rt_omniboard');
    await expect(feedContainer).toHaveCount(0);
    
    // Assert that the class omniboard-stream does not exist
    const feedStream = page.locator('.omniboard-stream');
    await expect(feedStream).toHaveCount(0);
  });
});
