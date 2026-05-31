import { test } from '@playwright/test';
import * as path from 'path';

test('verify translation UI and endpoints', async ({ page }) => {
  test.setTimeout(60000); // 60s timeout to allow server to start if slow
  
  // Navigate to login
  await page.goto('/login');

  // Fill credentials
  await page.waitForSelector('input[type="email"]');
  await page.fill('input[type="email"]', 'jrmendozaceo@apexbusiness-systems.com');
  
  await page.waitForSelector('input[type="password"]');
  await page.fill('input[type="password"]', 'Apex143!');

  // Click submit
  await page.click('button[type="submit"]');

  // Wait for dashboard to load (usually it's at /omnidash)
  await page.waitForURL('**/omnidash**', { timeout: 15000 });

  // Open Settings module from org dropdown
  await page.click('text=APEX Business Systems');
  await page.click('text=Workspace Settings');

  // Wait for Settings module to render (wait for the "Open Translator" button)
  await page.waitForSelector('button:has-text("Open Translator")', { timeout: 10000 });

  // Click the Open Translator button inside Settings
  await page.click('button:has-text("Open Translator")');
  
  // Wait for the Translation module to render (look for Semantic Translation)
  await page.waitForSelector('text=Semantic Translation', { timeout: 10000 });

  // Enter some text
  await page.waitForSelector('textarea[placeholder*="e.g.,"]', { timeout: 10000 });
  await page.fill('textarea[placeholder*="e.g.,"]', 'Hello');
  
  // Select target language (French)
  await page.selectOption('select', 'fr-FR');
  
  // Click Translate button
  await page.click('button:has-text("Translate")');
  
  // Verify translated text "Bonjour"
  await page.waitForSelector('textarea:has-text("Bonjour")', { timeout: 5000 });
  
  // Take a screenshot
  const screenshotPath = path.join(process.cwd(), 'artifacts', 'translation-verified.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });
  
  console.log(`UI verified successfully. Screenshot saved to ${screenshotPath}`);
});
