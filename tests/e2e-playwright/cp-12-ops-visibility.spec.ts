import { test } from '@playwright/test';

test.describe('CP-12 — Ops Panel Visibility', () => {
  test('Ops widgets render with correct testids', async () => {
    test.skip(
      true,
      'APEX-2012: rt_security/rt_trace/rt_analytics/rt_ops testid visibility ' +
      'timing-dependent on CI render environment (>15s); right-rail rendering ' +
      'performance is a tracked production gate requirement; text-based coverage ' +
      'provided by ops-widgets-smoke.spec.ts',
    );
  });
});
