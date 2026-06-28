import { test } from '@playwright/test';

test.describe('CP-08 — Media Upload via Files Widget', () => {
  test('Files widget resolves state via omnilink-port', async () => {
    // APEX-2008 superseded: Files → omnimedia-assets wiring now exists (Batch 3b).
    // Real upload→ingest→catalog coverage lives in omnimedia-pipeline.spec.ts.
    test.skip(true, 'Superseded by omnimedia-pipeline.spec.ts (APEX-2008 wiring landed in Batch 3b)');
  });
});
