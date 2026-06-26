import { test } from '@playwright/test';

test.describe('CP-08 — Media Upload via Files Widget', () => {
  test('Files widget resolves state via omnilink-port', async () => {
    test.skip(
      true,
      'APEX-2008: Files module omnilink-port wiring not connected from UI; ' +
      'handleModuleState() stub active — omnilink-port edge function integration ' +
      'pending before this test can pass',
    );
  });
});
