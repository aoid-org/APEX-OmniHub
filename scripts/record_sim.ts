import { chromium } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  console.log('Starting Recording Session...');
  
  let browser;
  try {
    console.log('Attempting to launch Edge...');
    browser = await chromium.launch({ channel: 'msedge' });
  } catch {
    // Ignore Edge failure, try Chrome
    console.log('Edge failed, attempting Chrome...');
    try {
      browser = await chromium.launch({ channel: 'chrome' });
    } catch {
      // Ignore Chrome failure, try bundled
      console.log('Chrome failed, attempting bundled Chromium...');
      browser = await chromium.launch();
    }
  }

  const context = await browser.newContext({
    recordVideo: {
      dir: path.resolve(__dirname, '../evidence'),
      size: { width: 1920, height: 1080 }
    },
    viewport: { width: 1920, height: 1080 }
  });

  const page = await context.newPage();
  
  // Construct absolute file path
  const htmlPath = path.resolve(__dirname, '../APEX_RECON_SIM.html');
  const fileUrl = `file://${htmlPath}`;
  
  console.log(`Navigating to: ${fileUrl}`);
  await page.goto(fileUrl);
  
  // Wait for initial load
  await page.waitForTimeout(1000);
  
  // Click Initiate
  console.log('Initiating Protocol...');
  await page.click('#initiate-btn');
  
  // Wait for animation (1.75s + buffer)
  console.log('Waiting for animation...');
  await page.waitForTimeout(4000);
  
  // Close to save video
  await page.close();
  await context.close();
  await browser.close();
  
  // Rename video
  const evidenceDir = path.resolve(__dirname, '../evidence');
  // Find the most recent webm file
  const files = fs.readdirSync(evidenceDir)
    .filter(f => f.endsWith('.webm'))
    .map(f => ({ name: f, time: fs.statSync(path.join(evidenceDir, f)).mtime.getTime() }))
    .sort((a, b) => b.time - a.time);
    
  if (files.length > 0) {
    const videoFile = files[0].name;
    const oldPath = path.join(evidenceDir, videoFile);
    const newPath = path.join(evidenceDir, 'APEX_RECON_SIM_DEMO.webm');
    
    // waiting a bit for file handle release just in case
    await new Promise(r => setTimeout(r, 1000));
    
    fs.renameSync(oldPath, newPath);
    console.log(`Video saved to: ${newPath}`);
  } else {
    console.error('No video file found!');
  }
}

try {
  await run();
} catch (e: unknown) {
  const err = e instanceof Error ? e : new Error(String(e));
  const logPath = path.resolve(__dirname, '../error.log');
  const errorMsg = `Error: ${err.message}\nStack: ${err.stack}\n`;
  fs.writeFileSync(logPath, errorMsg);
  console.error(err);
  process.exit(1);
}
