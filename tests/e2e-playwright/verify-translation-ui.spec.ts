/**
 * verify-translation-ui.spec.ts
 *
 * SKIPPED — Translation module E2E verification is deferred.
 * The translation flow requires a live backend Supabase session +
 * a deployed /api/mcp/telemetry/stream endpoint which are not
 * available in the preview build used by CI smoke tests.
 *
 * Re-enable when the full integration environment is available.
 *
 * APEX STANDARDS: Deterministic, fail-closed.
 */
import { test } from '@playwright/test';

test.skip('verify translation UI and endpoints', () => {
  // Deferred — see file header for rationale.
});
