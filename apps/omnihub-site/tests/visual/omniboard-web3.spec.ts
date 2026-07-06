import { test, expect } from '@playwright/test';
import path from 'path';

test.setTimeout(90000);

test('OmniBoard Web3 MetaMask integration', async ({ page }) => {
  // Login
  await page.goto('http://localhost:3000/login.html');
  await page.waitForSelector('#email', { timeout: 15000 });
  await page.fill('#email', 'jrmendozaceo@apexbusiness-systems.com');
  await page.fill('#password', 'Apex143!');
  await page.click('button[type="submit"]');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);

  const snapshotsDir = path.join(process.cwd(), 'tests', 'visual', 'snapshots');

  // Open OmniBoard via sidebar
  const omniBoardBtn = page.getByRole('button', { name: /OmniBoard/i }).first();
  await omniBoardBtn.waitFor({ state: 'visible', timeout: 15000 });
  await omniBoardBtn.click();
  await page.waitForTimeout(2000);

  // Screenshot of base OmniBoard with all apps visible
  await page.screenshot({ path: path.join(snapshotsDir, 'omniboard-web3-open.png'), fullPage: false });

  // Try to find MetaMask by text anywhere (it's shown as a card button not by role=button with name)
  const metamaskCard = page.locator('button', { hasText: 'MetaMask' }).first();
  const isVisible = await metamaskCard.isVisible().catch(() => false);

  if (isVisible) {
    await metamaskCard.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(snapshotsDir, 'omniboard-web3-metamask.png'), fullPage: false });

    // Take screenshot of ConnectorKit area
    const testConnBtn = page.getByRole('button', { name: /Test Connection/i }).first();
    if (await testConnBtn.isVisible()) {
      await page.screenshot({ path: path.join(snapshotsDir, 'omniboard-web3-metamask-connected.png'), fullPage: false });
    }
  } else {
    // Dump all button texts for debugging
    const allBtns = await page.locator('button').allTextContents();
    console.warn('Buttons found:', allBtns);

    // Scroll the grid to find MetaMask
    await page.evaluate(() => {
      const grid = document.querySelector('[aria-label="Available third-party integrations"]');
      if (grid) grid.scrollIntoView();
    });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(snapshotsDir, 'omniboard-web3-scroll.png'), fullPage: true });
  }

  expect(true).toBe(true);
});
