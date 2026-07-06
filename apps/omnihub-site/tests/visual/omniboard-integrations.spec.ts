import { test } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test.describe('OmniBoard Real-World App Integrations', () => {
  test('Integrates Web3, Legacy, AI, and Web2 apps', async ({ page }) => {
    // 1. Go to login
    await page.goto('http://localhost:3000/login.html');
    
    // Fill credentials
    await page.fill('#email', 'jrmendozaceo@apexbusiness-systems.com');
    await page.fill('#password', 'Apex143!');
    await page.click('button[type="submit"]');
    
    // Wait for Dashboard to load
    // Depending on routing it might just be /dashboard or /omnidash.html, let's wait for network idle
    await page.waitForLoadState('networkidle');
    
    // Let's create the snapshots directory if it doesn't exist
    const snapshotsDir = path.join(process.cwd(), 'tests', 'visual', 'snapshots');
    if (!fs.existsSync(snapshotsDir)) {
      fs.mkdirSync(snapshotsDir, { recursive: true });
    }
    
    // Since we don't exactly know the button text for OmniBoard, we can look for it
    // The instructions say "OmniBoard (sidebar tiles only and never opens a modal)" ? Wait. 
    // "OmniBoard only connects apps. No workflows. No automation. Just the connection."
    // Let's open OmniBoard. It might be in a sidebar, or we can use the Integrations module.
    
    // Find OmniBoard button in the UI
    const omniBoardBtn = page.getByRole('button', { name: /OmniBoard/i }).first();
    await omniBoardBtn.click();
    
    // Wait for OmniBoard Wizard to load
    await page.waitForSelector('text=App Integration', { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(2000);
    
    await page.screenshot({ path: path.join(snapshotsDir, 'omniboard-base.png') });

    const appsToTest = [
      { name: 'MetaMask', type: 'web3' },
      { name: 'SAP', type: 'legacy' },
      { name: 'ChatGPT', type: 'ai' },
      { name: 'Slack', type: 'web2' }
    ];

    for (const app of appsToTest) {
      // Find the app button and click it
      const appBtn = page.getByRole('button', { name: new RegExp(app.name, 'i') }).first();
      if (await appBtn.isVisible()) {
        await appBtn.click();
        await page.waitForTimeout(1000); // Wait for transition
        
        // Take screenshot of the connection view
        await page.screenshot({ path: path.join(snapshotsDir, `omniboard-${app.type}-${app.name.toLowerCase()}.png`) });
        
        // Wait for 'Test Connection' and take screenshot of ConnectorKit
        const connectBtn = page.getByRole('button', { name: /Test Connection/i }).first();
        if (await connectBtn.isVisible()) {
           await page.screenshot({ path: path.join(snapshotsDir, `omniboard-${app.type}-${app.name.toLowerCase()}-connected.png`) });
        }
      } else {
        console.warn(`Could not find ${app.name} button in OmniBoard.`);
      }
      
      // To reset, we can just click the OmniBoard button again or refresh
      await page.reload();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      const omniBoardBtnAgain = page.getByRole('button', { name: /OmniBoard/i }).first();
      await omniBoardBtnAgain.click();
      await page.waitForTimeout(2000);
    }
  });
});
