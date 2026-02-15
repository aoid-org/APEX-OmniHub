import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Output to root/docs/rca-screenshots relative to script location
const OUTPUT_DIR = path.resolve(__dirname, '../docs/rca-screenshots');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function capture(prefix) {
  console.log(`Starting capture run for prefix: ${prefix}...`);
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Use 127.0.0.1:3000 as confirmed by netstat
  const url = 'http://127.0.0.1:3000'; 
  console.log(`Navigating to ${url}...`);
  try {
    // networkidle is flaky, use domcontentloaded + manual wait
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    // Wait for critical hero content to be visible
    await page.waitForSelector('.hero', { timeout: 10000 });
    // Extra settle time for images/fonts
    await page.waitForTimeout(3000);
  } catch (e) {
     console.error('Failed to load page:', e);
     process.exit(1);
  }

  // Mobile
  console.log('Capturing Mobile...');
  await page.setViewportSize({ width: 375, height: 667 });
  await page.waitForTimeout(2000); 
  await page.screenshot({ path: path.join(OUTPUT_DIR, `3-mobile-${prefix}.png`) });

  // Tablet
  console.log('Capturing Tablet...');
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(OUTPUT_DIR, `2-tablet-${prefix}.png`) });

  // Desktop
  console.log('Capturing Desktop...');
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(OUTPUT_DIR, `1-desktop-${prefix}.png`) });

  await browser.close();
  console.log('Done.');
}

const prefix = process.argv[2] || 'after';
await capture(prefix);
