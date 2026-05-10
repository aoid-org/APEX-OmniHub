import { test, expect } from '../fixtures';

test.describe('01 — OmniDash Render & Telemetry Panels', () => {
  test('dashboard shell renders without blank screen', async ({ omniPage, omnihubUrl }) => {
    const consoleErrors: string[] = [];
    omniPage.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
    await omniPage.goto(omnihubUrl); await omniPage.waitForLoadState('networkidle');
    const root = omniPage.locator('#root, [data-testid="app-root"], main').first();
    await expect(root).toBeVisible();
    expect((await root.boundingBox())?.height ?? 0).toBeGreaterThan(100);
    expect(consoleErrors.filter((e) => !e.includes('favicon') && !e.includes('404'))).toHaveLength(0);
  });

  test('telemetry and draggable widget are visible', async ({ omniPage, omnihubUrl }) => {
    await omniPage.goto(`${omnihubUrl}/dashboard`); await omniPage.waitForLoadState('networkidle');
    await expect(omniPage.locator('[data-testid="telemetry-panel"], [data-testid="agent-status"], text=/agent|telemetry|status/i').first()).toBeVisible({ timeout: 15000 });
    await expect(omniPage.locator('[data-testid="draggable-widget"], [class*="draggable-widget"], [class*="DraggableWidget"]').first()).toBeVisible({ timeout: 10000 });
  });
});
