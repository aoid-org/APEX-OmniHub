/**
 * diag-console.spec.ts — Captures browser console errors from the login page
 * to identify the root cause of the blank page.
 */
import { test } from '@playwright/test';

test('capture console errors on login', async ({ page }) => {
  test.setTimeout(30000);

  const errors: string[] = [];
  const logs: string[] = [];

  page.on('console', (msg) => {
    const text = msg.text();
    logs.push(`[${msg.type()}] ${text}`);
    if (msg.type() === 'error') {
      errors.push(text);
    }
  });

  page.on('pageerror', (err) => {
    errors.push(`PAGE ERROR: ${err.message}`);
  });

  await page.goto('/login', { waitUntil: 'networkidle', timeout: 20000 });

  // Wait a moment for any deferred errors
  await page.waitForTimeout(3000);

  console.log('\n=== CONSOLE LOGS ===');
  for (const log of logs) {
    console.log(log);
  }

  console.log('\n=== PAGE ERRORS ===');
  if (errors.length === 0) {
    console.log('(none)');
  } else {
    for (const err of errors) {
      console.log(err);
    }
  }

  // Log HTML of #root to see if React mounted
  const rootHTML = await page.evaluate(() => {
    const el = document.getElementById('root');
    return el ? el.innerHTML.substring(0, 500) : 'NO #root ELEMENT';
  });
  console.log('\n=== #root HTML (first 500 chars) ===');
  console.log(rootHTML);

  // Check page URL
  console.log('\n=== FINAL URL ===');
  console.log(page.url());
});
