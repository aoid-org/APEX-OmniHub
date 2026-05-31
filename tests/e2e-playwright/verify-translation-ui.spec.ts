/**
 * verify-translation-ui.spec.ts
 *
 * E2E test: Verifies the full Translation Module UI flow in OmniDash.
 * - Logs in as APEX admin
 * - Opens Settings via org dropdown → Workspace Settings
 * - Clicks "Open Translator"
 * - Enters text, selects French, clicks Translate
 * - Verifies translated output contains "Bonjour"
 *
 * APEX STANDARDS: Deterministic, fail-closed, no hedging assertions.
 */
import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

test('verify translation UI and endpoints', async ({ page }, testInfo) => {
  testInfo.setTimeout(90000);
  // ── 0. Inject Playwright flag to disable intervals ────────────────
  await page.addInitScript(() => {
    (window as any).__PLAYWRIGHT_TEST__ = true;
  });



  // ── 1. Login ──────────────────────────────────────────────────────
  await page.goto('/login');
  await page.waitForSelector('input[type="email"]', { timeout: 15000 });
  await page.fill('input[type="email"]', 'jrmendozaceo@apexbusiness-systems.com');
  await page.fill('input[type="password"]', 'Apex143!');
  await page.click('button[type="submit"]');

  // ── 2. Wait for OmniDash ──────────────────────────────────────────
  await page.waitForURL('**/omnidash**', { timeout: 20000 });

  // ── 3. Open org dropdown ──────────────────────────────────────────
  await page.locator('#org-selector-btn').first().waitFor({ state: 'attached', timeout: 30000 });
  await page.locator('#org-selector-btn').first().evaluate((node) => (node as HTMLElement).click());

  // ── 4. Click Workspace Settings ───────────────────────────────────
  await page.locator('button:has-text("Workspace Settings")').first().waitFor({ state: 'attached', timeout: 15000 });
  await page.locator('button:has-text("Workspace Settings")').first().evaluate((node) => (node as HTMLElement).click());

  // ── 5. Wait for Settings modal with "Open Translator" button ──────
  // ── 6. Click Open Translator ──────────────────────────────────────
  await page.locator('button:has-text("Open Translator")').first().waitFor({ state: 'attached', timeout: 15000 });
  await page.locator('button:has-text("Open Translator")').first().evaluate((node) => (node as HTMLElement).click());

  // ── 7. Wait for Translation module heading ────────────────────────
  await page.locator('text=Semantic Translation').waitFor({ state: 'attached', timeout: 15000 });

  // ── 8. Type text into input ───────────────────────────────────────
  await page.locator('#translation-source-input').fill('Hello');

  // ── 9. Select target language ─────────────────────────────────────
  await page.locator('#translation-target-lang').selectOption('fr-FR');

  // ── 10. Click Translate ───────────────────────────────────────────
  await page.locator('#translation-translate-btn').click();

  // ── 11. Wait for output and verify "Bonjour" ─────────────────────
  await page.waitForSelector('#translation-output', { timeout: 10000 });
  const outputValue = await page.inputValue('#translation-output');
  expect(outputValue).toContain('Bonjour');

  // ── 12. Screenshot ────────────────────────────────────────────────
  const artifactsDir = path.join(process.cwd(), 'artifacts');
  if (!fs.existsSync(artifactsDir)) {
    fs.mkdirSync(artifactsDir, { recursive: true });
  }
  const screenshotPath = path.join(artifactsDir, 'translation-verified.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`✅ UI verified. Screenshot: ${screenshotPath}`);
});
