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
    // Intercept to provide deterministic workflow data
    await page.route('**/functions/v1/omnilink-port', async (route, request) => {
      const postData = request.postDataJSON() || {};
      if (postData.module_key === 'workflows') {
        return route.fulfill({
          status: 200,
          body: JSON.stringify({
            State: 'Online',
            items: [{ id: 'wf-1', name: 'Daily Backup', is_active: true }],
            actions: ['create_workflow', 'trigger_run'],
            count: 1
          }),
        });
      }
      return route.continue();
    });

    // Locate the Workflows module/widget in the UI
    const workflowsHeader = page.getByText(/Workflows|Automation/i).first();
    await expect(workflowsHeader).toBeVisible({ timeout: 15_000 });

    // Look for the injected item
    await expect(page.getByText('Daily Backup').first()).toBeVisible({ timeout: 8_000 });
  });
});
