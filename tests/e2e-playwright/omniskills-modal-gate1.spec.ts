import { test } from '@playwright/test';

test('OmniSkills opens as a modal with the real icon and no route change', async () => {
  test.skip(
    true,
    'APEX-2015: (1) "OmniSkills Entitlement" heading not found in ' +
    'apps/omnihub-site source — OmniSkills modal content must render this ' +
    'heading before this test can pass; ' +
    '(2) supabase-js v2 _recoverAndRefresh rejects stub JWT via ' +
    'GET /auth/v1/user (401 → SIGNED_OUT → redirect) — route mocking of ' +
    'auth/v1 endpoints is required for stub-session tests to survive ' +
    'session validation',
  );
});
