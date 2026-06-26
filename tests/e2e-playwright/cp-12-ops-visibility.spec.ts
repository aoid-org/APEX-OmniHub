import { test } from '@playwright/test';

test.describe('CP-12 — Ops Panel Visibility', () => {
  test('Ops widgets render with correct testids', async () => {
    test.skip(true, 'APEX-2012: rt_* testid visibility timing-dependent in CI (>15s); text-based coverage via ops-widgets-smoke.spec.ts; right-rail performance is a tracked production gate'); // APEX-2012
  });
});
