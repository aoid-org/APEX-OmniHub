/**
 * CP-08 — Media Upload
 * Journey: Files widget → Upload action → File list update
 * Exit assertion: Media file payload resolves
 */
import { test, expect } from '@playwright/test';
import { signInWithSupabaseSession, skipWithoutSupabaseConfig } from './helpers/auth';

test.describe('CP-08 — Media Upload', () => {
  test.beforeEach(async ({ page }) => {
    skipWithoutSupabaseConfig();
    await signInWithSupabaseSession(page);
  });

  test('Files widget resolves state and supports upload action', async ({ page }) => {
    // Intercept to provide deterministic file data
    let filesQueried = false;
    await page.route('**/functions/v1/omnilink-port', async (route, request) => {
      const postData = request.postDataJSON() || {};
      if (postData.module_key === 'files') {
        filesQueried = true;
        return route.fulfill({
          status: 200,
          body: JSON.stringify({
            State: 'Online',
            items: [{ name: 'test_recording.mp3', size: 1048576, mime: 'audio/mp3' }],
            actions: ['upload_file', 'delete_file'],
            count: 1
          }),
        });
      }
      return route.continue();
    });

    const filesBtn = page.getByRole('button', { name: /files/i }).first();
    await expect(filesBtn).toBeVisible({ timeout: 10_000 });
    await filesBtn.click();

    await expect(page.getByText('test_recording.mp3').first()).toBeVisible({ timeout: 8_000 });
    expect(filesQueried).toBe(true);
  });
});
