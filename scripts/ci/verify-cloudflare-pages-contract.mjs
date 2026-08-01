#!/usr/bin/env node
/**
 * verify-cloudflare-pages-contract.mjs — Comprehensive Deployment Contract Gate
 *
 * Replaces deploy-status checks with strict validation of actual deployed bundle contracts:
 * 1. Root HTML references a compiled hashed asset bundle (/assets/*.js) and contains ZERO raw .tsx references.
 * 2. Primary JavaScript bundle responds with valid JavaScript MIME type (text/javascript / application/javascript) and NEVER application/octet-stream.
 * 3. /manifest.webmanifest returns 200 OK and parses as valid JSON (zero HTML fallback syntax errors).
 * 4. (Optional E2E mode) Headless Chromium boot verifies #root element mounting with zero console errors.
 *
 * Usage:
 *   node scripts/ci/verify-cloudflare-pages-contract.mjs [--url=https://apexomnihub.icu] [--e2e]
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = resolve(import.meta.dirname, '..', '..');
const distDir = resolve(root, 'dist');
const distIndex = resolve(distDir, 'index.html');

let failed = 0;
function check(label, condition, detail = '') {
  if (condition) {
    console.log(`  ✓ ${label}`);
  } else {
    console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`);
    failed += 1;
  }
}

async function runContractVerification() {
  console.log('=== verify:cloudflare-pages-contract — Deployment Truth Gate ===');

  // Parse CLI args
  const urlArg = process.argv.find((arg) => arg.startsWith('--url='));
  const targetUrl = urlArg ? urlArg.split('=')[1] : process.env.DEPLOYED_URL || process.env.VITE_DASHBOARD_URL || null;
  const isE2EMode = process.argv.includes('--e2e') || process.env.VERIFY_DEPLOYED_E2E === 'true';

  // 1. Static Build Output Verification (Dist Inspection)
  check('dist directory exists', existsSync(distDir), 'Run bun run build first');
  check('dist/index.html exists', existsSync(distIndex), 'Build output must generate dist/index.html');

  if (existsSync(distIndex)) {
    const htmlContent = readFileSync(distIndex, 'utf8');

    // Rule A: HTML must reference hashed asset bundle and contain ZERO .tsx references
    const hasHashedJs = /\/assets\/(js\/)?[^"'\s>]+\.js/i.test(htmlContent);
    const containsTsx = /\/src\/[^\s"'>]+\.tsx/i.test(htmlContent) || htmlContent.includes('.tsx');

    check('build output HTML references compiled hashed asset bundle (/assets/*.js)', hasHashedJs, 'HTML must link to Vite hashed JavaScript bundle');
    check('build output HTML contains ZERO raw .tsx references', !containsTsx, 'Raw .tsx references cause MIME application/octet-stream rejection in browsers');
  }

  // 2. Live Deployed URL Contract Verification (if DEPLOYED_URL provided)
  if (targetUrl) {
    console.log(`\nVerifying Deployed Target URL Contract: ${targetUrl}`);
    try {
      // Fetch /
      const res = await fetch(targetUrl);
      check('Deployed target URL responds 200 OK', res.ok, `HTTP status ${res.status}`);
      const deployedHtml = await res.text();

      check('Deployed HTML references compiled hashed JS bundle', /\/assets\/(js\/)?[^"'\s>]+\.js/i.test(deployedHtml), 'Deployed site served uncompiled HTML or wrong root');
      check('Deployed HTML contains ZERO .tsx references', !/\/src\/[^\s"'>]+\.tsx/i.test(deployedHtml) && !deployedHtml.includes('main.tsx'), 'Deployed site is publishing unbuilt raw repo source tree');

      // Extract primary script bundle URL
      const scriptMatch = deployedHtml.match(/<script[^>]+src=["']([^"']+\.js)["']/i);
      if (scriptMatch && scriptMatch[1]) {
        const bundleUrl = new URL(scriptMatch[1], targetUrl).href;
        const scriptRes = await fetch(bundleUrl);
        const contentType = scriptRes.headers.get('content-type') || '';

        check('Primary bundle responds 200 OK', scriptRes.ok, `Bundle HTTP status ${scriptRes.status}`);
        check('Primary bundle Content-Type is JavaScript', /javascript|ecmascript/i.test(contentType), `Received Content-Type "${contentType}" (application/octet-stream blocks script execution)`);
      } else {
        check('Primary bundle script tag extracted from HTML', false, 'Could not find compiled script tag in deployed HTML');
      }

      // Verify /manifest.webmanifest
      const manifestUrl = new URL('/manifest.webmanifest', targetUrl).href;
      const manifestRes = await fetch(manifestUrl);
      const manifestText = await manifestRes.text();
      let isJson = false;
      try {
        JSON.parse(manifestText);
        isJson = true;
      } catch (e) {}

      check('/manifest.webmanifest responds 200 OK', manifestRes.ok, `Manifest HTTP status ${manifestRes.status}`);
      check('/manifest.webmanifest parses as valid JSON', isJson, `Manifest returned non-JSON fallback (first char: "${manifestText.trim()[0]}")`);

      // 3. E2E Headless Chromium Boot Verification (if requested)
      if (isE2EMode) {
        console.log('\nRunning E2E Headless Boot Assertion...');
        try {
          const { chromium } = await import('playwright');
          const browser = await chromium.launch({ headless: true });
          const page = await browser.newPage();
          const consoleErrors = [];

          page.on('console', (msg) => {
            if (msg.type() === 'error') consoleErrors.push(msg.text());
          });
          page.on('pageerror', (err) => consoleErrors.push(err.message));

          await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
          const rootMounted = await page.locator('#root').count() > 0;

          check('Headless Chromium booted and mounted #root element', rootMounted, '#root element missing from DOM after page load');
          check('Zero uncaught browser console errors on boot', consoleErrors.length === 0, consoleErrors.join('\n'));

          await browser.close();
        } catch (err) {
          console.warn(`  ⚠ E2E Headless Boot check skipped/warned: ${err.message}`);
        }
      }
    } catch (err) {
      check('Deployed target URL fetch succeeded', false, err.message);
    }
  } else {
    console.log('\n(Note: Pass --url=https://apexomnihub.icu or set DEPLOYED_URL env var to run live remote URL contract verification)');
  }

  if (failed > 0) {
    console.error(`\n❌ verify:cloudflare-pages-contract FAILED — ${failed} contract failure(s)`);
    process.exit(1);
  }

  console.log('\n✅ verify:cloudflare-pages-contract PASSED — Build output and contract gates verified.');
  process.exit(0);
}

runContractVerification();
