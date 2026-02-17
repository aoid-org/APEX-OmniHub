import { chromium } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  console.log('Starting App Demo Recording...');
  
  // Use system browser fallback
  let browser;
  try {
    browser = await chromium.launch({ channel: 'msedge', headless: false });
  } catch {
    try {
      browser = await chromium.launch({ channel: 'chrome', headless: false });
    } catch {
      browser = await chromium.launch({ headless: false });
    }
  }

  const evidenceDir = path.resolve(__dirname, '../evidence');
  fs.mkdirSync(evidenceDir, { recursive: true });

  const context = await browser.newContext({
    recordVideo: {
      dir: evidenceDir,
      size: { width: 1920, height: 1080 }
    },
    viewport: { width: 1920, height: 1080 }
  });

  // Inject OmniDash feature flags
  await context.addInitScript(() => {
    globalThis.localStorage.setItem('OMNIDASH_ENABLED', '1');
    globalThis.localStorage.setItem('VITE_OMNIDASH_ENABLED', 'true');
  });

  const page = await context.newPage();
  
  // Debug: Log browser errors only
  page.on('pageerror', err => console.log(`BROWSER ERROR: ${err.message}`));

  const baseURL = 'http://localhost:5182';

  try {
    // --- Scene 1: Landing Page ---
    console.log('Scene 1: Landing Page');
    await page.goto(baseURL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);
    // Take screenshot for evidence
    await page.screenshot({ path: path.join(evidenceDir, 'landing_page.png') });
    console.log('Landing page screenshot saved');

    // Smooth mouse movement across hero section
    await page.mouse.move(960, 400);
    await page.waitForTimeout(500);
    await page.mouse.move(500, 300);
    await page.waitForTimeout(1000);

    // --- Scene 2: OmniDash Dashboard ---
    console.log('Scene 2: OmniDash Dashboard');
    await page.goto(`${baseURL}/omnidash`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(evidenceDir, 'omnidash.png') });
    console.log('OmniDash screenshot saved');

    // Interact with dashboard
    await page.mouse.move(200, 400); // Sidebar
    await page.waitForTimeout(1000);
    await page.mouse.move(800, 500); // Content area
    await page.waitForTimeout(2000);

    // --- Scene 3: Tech Specs ---
    console.log('Scene 3: Tech Specs');
    await page.goto(`${baseURL}/tech-specs`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);
    await page.evaluate(() => window.scrollTo({ top: 500, behavior: 'smooth' }));
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(evidenceDir, 'tech_specs.png') });

    // --- Scene 4: App Showcase ---
    console.log('Scene 4: TradeLine247');
    await page.goto(`${baseURL}/apps/tradeline247`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(evidenceDir, 'tradeline.png') });

    console.log('Demo recording complete!');
  } finally {
    await page.close();
    await context.close();
    await browser.close();
  }
  
  // Rename video
  await new Promise(r => setTimeout(r, 2000)); // Wait for video to finalize
  const files = fs.readdirSync(evidenceDir)
    .filter(f => f.endsWith('.webm') && f !== 'OMNILINK_APP_DEMO.webm')
    .map(f => ({ name: f, time: fs.statSync(path.join(evidenceDir, f)).mtime.getTime() }))
    .sort((a, b) => b.time - a.time);
    
  if (files.length > 0) {
    const oldPath = path.join(evidenceDir, files[0].name);
    const newPath = path.join(evidenceDir, 'OMNILINK_APP_DEMO.webm');
    if (fs.existsSync(newPath)) fs.unlinkSync(newPath);
    fs.renameSync(oldPath, newPath);
    console.log(`Video saved to: ${newPath}`);
    
    // Also copy to project root
    const rootCopy = path.resolve(__dirname, '..', 'OMNILINK_APP_DEMO.webm');
    fs.copyFileSync(newPath, rootCopy);
    console.log(`Video copied to: ${rootCopy}`);
  }
}

try {
  await run();
} catch (e: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
  const logPath = path.resolve(__dirname, '../demo_error.log');
  fs.writeFileSync(logPath, `Error: ${e.message}\nStack: ${e.stack}\n`);
  console.error('Recording failed:', e.message);
  process.exit(1);
}
