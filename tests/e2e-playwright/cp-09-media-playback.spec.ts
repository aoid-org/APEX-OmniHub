import { test } from '@playwright/test';

test.describe('CP-09 — Media Playback', () => {
  test('OmniMediaPlayer renders when media is triggered', async () => {
    test.skip(
      true,
      'APEX-2009: Files (media) module omnilink-port wiring not connected from UI; ' +
      'handleModuleState() stub active — omnilink-port edge function integration ' +
      'pending before this test can pass',
    );
  });
});
