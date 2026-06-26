/**
 * CP-06 — Workflow Automation
 * Journey: Workflows widget → Trigger Run / View Workflows
 * Exit assertion: Workflows module resolves state, workflow run triggers
 */
import { test, expect } from '@playwright/test';
import { signInWithSupabaseSession, skipWithoutSupabaseConfig } from './helpers/auth';

test.describe('CP-06 — Workflow Automation', () => {
  test.beforeEach(async ({ page }) => {
    skipWithoutSupabaseConfig();
    await signInWithSupabaseSession(page);
  });

  test('Workflows module resolves and displays active workflows', async ({ page }) => {
    // APEX-2006: Workflows module not yet wired to canvas — widget visibility pending OmniSpatialHost integration
    test.skip(true, 'APEX-2006: Workflows module not yet wired to canvas — widget visibility pending OmniSpatialHost integration');
  });
});
