import { test } from '@playwright/test';

test.describe('CP-09 — Media Playback', () => {
  test('OmniMediaPlayer renders when media is triggered', async () => {
    // APEX-2009 superseded: real first-party playback (upload → catalog → play)
    // now has end-to-end coverage in omnimedia-pipeline.spec.ts.
    test.skip(true, 'Superseded by omnimedia-pipeline.spec.ts (APEX-2009 wiring landed in Batch 3b)');
  });
});
