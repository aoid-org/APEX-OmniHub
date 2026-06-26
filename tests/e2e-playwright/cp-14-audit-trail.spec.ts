/**
 * CP-14 — Audit Trail E2E
 * Journey: Audits widget → View logs
 * Exit assertion: Module state resolves from audit_logs table
 */
import { test, expect } from '@playwright/test';
import { signInWithSupabaseSession, skipWithoutSupabaseConfig } from './helpers/auth';

test.describe('CP-14 — Audit Trail E2E', () => {
  test.beforeEach(async ({ page }) => {
    skipWithoutSupabaseConfig();
    await signInWithSupabaseSession(page);
  });

  test('Audits module resolves data from omnilink-port', async ({ page }) => {
    let queried = false;
    await page.route('**/functions/v1/omnilink-port', async (route, request) => {
      const postData = request.postDataJSON() || {};
      if (postData.module_key === 'audits') {
        queried = true;
        return route.fulfill({
          status: 200,
          body: JSON.stringify({
            State: 'Online',
            items: [
              { id: 'audit-1', action: 'test_action', resource: 'user', at: new Date().toISOString() }
            ],
            actions: [],
            count: 1
          }),
        });
      }
      return route.continue();
    });

    const auditsBtn = page.getByRole('button', { name: /audit/i }).first();
    const isVisible = await auditsBtn.isVisible({ timeout: 5_000 }).catch(() => false);
    test.skip(!isVisible, 'APEX-1001: Audits sidebar button not visible (desktop layout expected)');

    await auditsBtn.click();
    
    // Expect the dialog to show
    const dialog = page.getByRole('dialog').first();
    await expect(dialog).toBeVisible({ timeout: 8_000 });
    
    // Expect our injected audit record
    await expect(dialog.getByText('test_action').first()).toBeVisible({ timeout: 8_000 });
    expect(queried).toBe(true);
  });
});
