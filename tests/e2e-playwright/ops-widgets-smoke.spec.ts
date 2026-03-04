import { test, expect } from '@playwright/test';

/**
 * Ops Widgets Smoke Test — Component Stability Gate
 *
 * Required when Ops UI is modified. Verifies:
 * 1. Memory Health widget renders
 * 2. System Resilience widget renders
 * 3. No console errors
 * 4. No stable export renames (test-ids remain valid)
 */
test.describe('Ops Widgets Smoke (Component Stability Gate)', () => {
  test('Memory Health and System Resilience widgets render', async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/omnidash/ops', { waitUntil: 'networkidle' });

    // Memory Health widget must be visible
    const memoryHealthCard = page.getByTestId('widget-memory-health');
    await expect(memoryHealthCard).toBeVisible({ timeout: 10000 });

    // System Resilience widget must be visible
    const resilienceCard = page.getByTestId('widget-system-resilience');
    await expect(resilienceCard).toBeVisible({ timeout: 10000 });

    // Freeze Switch widget must be visible (pre-existing)
    const freezeCard = page.getByText('Freeze switch');
    await expect(freezeCard).toBeVisible({ timeout: 10000 });

    // Incident log section must be visible
    const incidentLog = page.getByText('Incident log');
    await expect(incidentLog).toBeVisible({ timeout: 10000 });

    // No console errors allowed
    expect(consoleErrors).toHaveLength(0);
  });
});
