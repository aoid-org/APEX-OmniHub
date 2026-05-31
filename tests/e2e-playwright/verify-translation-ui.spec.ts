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

test('verify translation UI and endpoints', async ({ page }) => {
  test.setTimeout(90000);

  // ── 1. Login ──────────────────────────────────────────────────────
  await page.goto('/login');
  await page.waitForSelector('input[type="email"]', { timeout: 15000 });
  await page.fill('input[type="email"]', 'jrmendozaceo@apexbusiness-systems.com');
  await page.fill('input[type="password"]', 'Apex143!');
  await page.click('button[type="submit"]');

  // ── 2. Wait for OmniDash ──────────────────────────────────────────
  await page.waitForURL('**/omnidash**', { timeout: 20000 });

  // ── 3. Open org dropdown ──────────────────────────────────────────
  // The button contains "APEX Business Systems" text (span inside button)
  await page.click('button:has-text("APEX Business Systems")', { timeout: 10000 });

  // ── 4. Click Workspace Settings ───────────────────────────────────
  await page.click('button:has-text("Workspace Settings")', { timeout: 8000 });

  // ── 5. Wait for Settings modal with "Open Translator" button ──────
  await page.waitForSelector('button:has-text("Open Translator")', { timeout: 15000 });

  // ── 6. Click Open Translator ──────────────────────────────────────
  await page.click('button:has-text("Open Translator")');

  // ── 7. Wait for Translation module heading ────────────────────────
  await page.waitForSelector('text=Semantic Translation', { timeout: 15000 });

  // ── 8. Fill source text via stable ID ────────────────────────────
  await page.waitForSelector('#translation-source-input', { timeout: 10000 });
  await page.fill('#translation-source-input', 'Hello');

  // ── 9. Select French via stable ID ───────────────────────────────
  await page.selectOption('#translation-target-lang', 'fr-FR');

  // ── 10. Click Translate ───────────────────────────────────────────
  await page.click('#translation-translate-btn');

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
