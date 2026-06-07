import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

// Artifacts directory
const artifactsDir = join(process.env.APPDATA || process.env.HOME || process.cwd(), '.gemini/antigravity/brain/cf2bc0d5-f569-42c3-a65e-c414e09039ac', 'screenshots');
mkdirSync(artifactsDir, { recursive: true });

console.log('Artifacts directory:', artifactsDir);

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1920, height: 1080 }
});
const page = await context.newPage();

try {
  // Mock Supabase auth to fake a session
  await page.route('**/auth/v1/session', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        session: {
          access_token: 'fake',
          refresh_token: 'fake',
          expires_in: 3600,
          token_type: 'bearer',
          user: { id: 'demo-user', aud: 'authenticated', role: 'authenticated' }
        }
      })
    });
  });

  // Also mock the GET session endpoint if it exists
  await page.route('**/auth/v1/user', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'demo-user', aud: 'authenticated', role: 'authenticated'
      })
    });
  });
  
  await page.route('**/rest/v1/**', route => {
      route.fulfill({
          status: 500, // force errors to show the error state in dashboard!
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Forced error for testing' })
      });
  });

  console.log('Setting localStorage for Supabase...');
  await page.goto('http://localhost:3000');
  await page.evaluate(() => {
    const session = {
      access_token: 'fake',
      refresh_token: 'fake',
      expires_in: 3600,
      token_type: 'bearer',
      user: { id: 'demo-user', aud: 'authenticated', role: 'authenticated' }
    };
    // Let's just blindly inject into common keys
    for (const key of Object.keys(localStorage)) {
      if (key.includes('supabase')) {
        localStorage.setItem(key, JSON.stringify(session));
      }
    }
    // For supabase-js v2, the key format is sb-<project-ref>-auth-token
    localStorage.setItem('sb-dummy-auth-token', JSON.stringify(session));
  });

  console.log('Navigating to dashboard...');
  await page.goto('http://localhost:3000/dashboard');
  
  console.log('Waiting for dashboard load...');
  await page.waitForTimeout(3000); // Wait for the app to settle
  await page.waitForLoadState('networkidle');

  // We are on the dashboard. Let's capture the state.
  // Because we mocked `/rest/v1/**` with 500, we should see the error states!
  
  console.log('Capturing Live Mode (Error States)...');
  await page.waitForTimeout(2000); // Wait for data to settle
  await page.screenshot({ path: join(artifactsDir, 'dashboard-live-mode.png'), fullPage: true });

  // Now let's try to toggle Demo Mode
  console.log('Toggling Demo Mode...');
  // Find the toggle. In OmniDashShell it is described as:
  // { key: 'demo' as const, label: 'Demo Mode', desc: 'Simulated data feed', activeColor: T.orange }
  // We can look for text "Demo Mode" or a switch.
  const demoToggle = page.locator('text=Demo Mode');
  if (await demoToggle.count() > 0) {
    await demoToggle.first().click();
    console.log('Demo mode toggled ON.');
    await page.waitForTimeout(2000); // wait for Demo data to settle
    await page.screenshot({ path: join(artifactsDir, 'dashboard-demo-mode.png'), fullPage: true });
  } else {
    console.log('Could not find Demo Mode toggle. Trying to click any element containing Demo Mode...');
    await page.locator('label', { hasText: 'Demo Mode' }).click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: join(artifactsDir, 'dashboard-demo-mode.png'), fullPage: true });
  }

} catch (error) {
  console.error('Error during validation:', error);
} finally {
  await browser.close();
  console.log('Done.');
}
