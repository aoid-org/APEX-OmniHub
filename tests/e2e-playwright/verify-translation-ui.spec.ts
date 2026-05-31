/**
 * verify-translation-ui.spec.ts
 *
 * E2E test: Verifies the full Translation Module UI flow in OmniDash.
 * - Logs in as APEX admin
 * - Opens Settings via org dropdown ΓåÆ Workspace Settings
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
  // ΓöÇΓöÇ 0. Inject Playwright flag to disable intervals ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  await page.addInitScript(() => {
    (window as any).__PLAYWRIGHT_TEST__ = true;
  });



  // ΓöÇΓöÇ 1. Login ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  await page.goto('/login');
  await page.waitForSelector('input[type="email"]', { timeout: 15000 });
  await page.fill('input[type="email"]', 'jrmendozaceo@apexbusiness-systems.com');
  await page.fill('input[type="password"]', 'Apex143!');
  await page.click('button[type="submit"]');

  // ΓöÇΓöÇ 2. Wait for OmniDash ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  await page.waitForURL('**/omnidash**', { timeout: 20000 });

  // ΓöÇΓöÇ 3. Open org dropdown ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  await page.locator('#org-selector-btn').first().waitFor({ state: 'attached', timeout: 30000 });
  await page.locator('#org-selector-btn').first().evaluate((node) => (node as HTMLElement).click());

  // ΓöÇΓöÇ 4. Click Workspace Settings ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  await page.locator('button:has-text("Workspace Settings")').first().waitFor({ state: 'attached', timeout: 15000 });
  await page.locator('button:has-text("Workspace Settings")').first().evaluate((node) => (node as HTMLElement).click());

  // ΓöÇΓöÇ 5. Wait for Settings modal with "Open Translator" button ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  // ΓöÇΓöÇ 6. Click Open Translator ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  await page.locator('button:has-text("Open Translator")').first().waitFor({ state: 'attached', timeout: 15000 });
  await page.locator('button:has-text("Open Translator")').first().evaluate((node) => (node as HTMLElement).click());

  // ΓöÇΓöÇ 7. Wait for Translation module heading ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  await page.locator('text=Semantic Translation').waitFor({ state: 'attached', timeout: 15000 });

  // ΓöÇΓöÇ 8. Type text into input ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  await page.locator('#translation-source-input').fill('Hello');

  // ΓöÇΓöÇ 9. Select target language ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  await page.locator('#translation-target-lang').selectOption('fr-FR');

  // ΓöÇΓöÇ 10. Click Translate ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  await page.locator('#translation-translate-btn').click();

  // ΓöÇΓöÇ 11. Wait for output and verify "Bonjour" ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  await page.waitForSelector('#translation-output', { timeout: 10000 });
  const outputValue = await page.inputValue('#translation-output');
  expect(outputValue).toContain('Bonjour');

  // ΓöÇΓöÇ 12. Screenshot ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  const artifactsDir = path.join(process.cwd(), 'artifacts');
  if (!fs.existsSync(artifactsDir)) {
    fs.mkdirSync(artifactsDir, { recursive: true });
  }
  const screenshotPath = path.join(artifactsDir, 'translation-verified.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`Γ£à UI verified. Screenshot: ${screenshotPath}`);
});
