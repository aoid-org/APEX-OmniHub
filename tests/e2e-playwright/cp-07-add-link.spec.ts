import { test } from '@playwright/test';

test.describe('CP-07 — Add Link via Links Widget', () => {
  test('Links widget adds a link via omnilink-port', async () => {
    test.skip(
      true,
      'APEX-2007: Links module omnilink-port wiring not connected from UI; ' +
      'handleModuleState() stub active — omnilink-port edge function integration ' +
      'pending before this test can pass',
    );
  });
});
