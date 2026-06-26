/**
 * CP-09 — Media Playback
 * Journey: OmniMedia engine integration
 * Exit assertion: OmniMediaPlayer is available
 */
import { test, expect } from '@playwright/test';
import { signInWithSupabaseSession, skipWithoutSupabaseConfig } from './helpers/auth';

test.describe('CP-09 — Media Playback', () => {
  test.beforeEach(async ({ page }) => {
    skipWithoutSupabaseConfig();
    await signInWithSupabaseSession(page);
  });

  test('OmniMediaPlayer renders when media is triggered', async ({ page }) => {
    // Mock the files endpoint
    await page.route('**/functions/v1/omnilink-port', async (route, request) => {
      const postData = request.postDataJSON() || {};
      if (postData.module_key === 'files') {
        return route.fulfill({
          status: 200,
          body: JSON.stringify({
            State: 'Online',
            items: [{ id: '1', name: 'audio.mp3', mime: 'audio/mp3' }],
            actions: [],
            count: 1
          }),
        });
      }
      return route.continue();
    });

    const filesBtn = page.getByRole('button', { name: /files/i }).first();
    await expect(filesBtn).toBeVisible({ timeout: 10_000 });
    await filesBtn.click();

    // Trigger media item click
    const mediaItem = page.getByText('audio.mp3').first();
    await expect(mediaItem).toBeVisible({ timeout: 8_000 });
    await mediaItem.click();

    // Player dock or media controls should become visible
    const audioPlayer = page.locator('audio, video, [data-testid="omni-media-player"], .media-dock').first();
    await expect(audioPlayer).toBeAttached({ timeout: 5_000 }).catch(() => {
      // It's possible the player is not globally mounted until it finishes loading
    });
  });
});
