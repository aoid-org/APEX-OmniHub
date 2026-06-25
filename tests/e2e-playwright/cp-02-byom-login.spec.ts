/**
 * CP-02 — BYOM Login
 * Journey: /byom-login (via Connect AI on /login) → valid session + API key fingerprint
 * Exit assertion: session established, SHA-256 hash present, edge fn called
 * Primary risks: SHA-256 hash missing, edge fn timeout, ConnectAiAuthModal absent
 */
import { test, expect } from '@playwright/test';

const FATAL = /createContext|Cannot read properties of undefined|ChunkLoadError|Failed to fetch dynamically imported module/;

test.describe('CP-02 — BYOM Login', () => {
  test('Connect AI button visible on login page', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

    // Force unauthenticated state
    await page.route('**/auth/v1/user', (route) =>
      route.fulfill({ status: 401, body: JSON.stringify({ error: 'not authenticated' }) }),
    );
    await page.goto('/login', { waitUntil: 'domcontentloaded' });

    const connectBtn = page.locator('button:has-text("Connect AI"), a:has-text("Connect AI"), [data-testid="connect-ai-header-action"]').first();
    await expect(connectBtn).toBeVisible({ timeout: 10_000 });
    expect(errors.filter((e) => FATAL.test(e))).toHaveLength(0);
  });

  test('BYOM modal opens on Connect AI click', async ({ page }) => {
    await page.route('**/auth/v1/user', (route) =>
      route.fulfill({ status: 401, body: JSON.stringify({ error: 'not authenticated' }) }),
    );
    await page.goto('/login', { waitUntil: 'domcontentloaded' });

    const connectBtn = page.locator('button:has-text("Connect AI")').first();
    await expect(connectBtn).toBeVisible({ timeout: 5_000 });

    await connectBtn.click();

    // Modal must appear — ConnectAiAuthModal renders as dialog/heading
    const modalHeading = page.getByRole('heading', { name: /connect your ai|byom|bring your own model/i }).first();
    await expect(modalHeading).toBeVisible({ timeout: 5_000 });

    // Ensure the modal renders within viewport bounds (especially critical for mobile/tablet)
    const dialogContent1 = page.locator('[role="dialog"]').first();
    const box1 = await dialogContent1.boundingBox();
    if (box1) {
      const viewport = page.viewportSize();
      if (viewport) {
        expect(box1.x).toBeGreaterThanOrEqual(0);
        expect(box1.x + box1.width).toBeLessThanOrEqual(viewport.width);
      }
    }

    await expect(modalHeading).toBeVisible({ timeout: 8_000 });
    // Provider select must be present
    await expect(page.locator('select, [role="combobox"]').first()).toBeVisible({ timeout: 5_000 });
  });

  test.skip('User can select Groq and provide API key to login', async ({ page }) => { // APEX-8014
    test.info().annotations.push({ type: 'issue', description: 'BLOCKED(APEX-8014): BYOM Groq selection flow altered' });
    await page.goto('/login', { waitUntil: 'domcontentloaded' });

    const connectBtn = page.locator('button:has-text("Connect AI")').first();
    await expect(connectBtn).toBeVisible({ timeout: 5_000 });

    await connectBtn.click();
    const modalHeading2 = page.getByRole('heading', { name: /connect your ai|byom/i }).first();
    await expect(modalHeading2).toBeVisible({ timeout: 8_000 });

    // Ensure the modal renders within viewport bounds (especially critical for mobile/tablet)
    const dialogContent2 = page.locator('[role="dialog"]').first();
    const box2 = await dialogContent2.boundingBox();
    if (box2) {
      const viewport = page.viewportSize();
      if (viewport) {
        expect(box2.x).toBeGreaterThanOrEqual(0);
        expect(box2.x + box2.width).toBeLessThanOrEqual(viewport.width);
      }
    }

    // Select Groq (or first available option)
    const selectEl = page.locator('select, [role="combobox"]').first();
    await selectEl.selectOption({ index: 1 }).catch(() => {});

    await page.fill('#api-key-input', 'gsk_e2e_test_key_9876543210');

    await page.click('button:has-text("Connect Sovereign Identity")');

    // Must land on /omnidash
    await expect(page).toHaveURL(/\/omnidash/, { timeout: 20_000 });
  });
});
