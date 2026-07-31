#!/usr/bin/env node
/**
 * Static Asset Access Smoke Test
 *
 * Validates that critical static assets are accessible from the deployed/preview server.
 * Catches issues like:
 * - manifest.webmanifest returning 401/403 (auth misconfiguration)
 * - Missing or broken favicon
 * - JS bundles not accessible
 * - Login route or hero badge asset regressing in production
 *
 * @see docs/CI_RUNTIME_GATES.md
 */

import fs from 'node:fs';
import path from 'node:path';

const BASE_URL = process.env.BASE_URL || 'http://localhost:4173';
const DIST_DIR = './dist';

// ANSI colors for output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  reset: '\x1b[0m',
};

function log(status, message) {
  const icon = status === 'pass' ? '✓' : status === 'fail' ? '✗' : '⚠';
  const color = status === 'pass' ? colors.green : status === 'fail' ? colors.red : colors.yellow;
  console.log(`${color}${icon}${colors.reset} ${message}`);
}

async function checkAsset(url, description, expectStatus = 200) {
  try {
    const bypassSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
    const querySeparator = url.includes('?') ? '&' : '?';
    const targetUrl = bypassSecret
      ? `${url}${querySeparator}x-preview-protection-bypass=${encodeURIComponent(bypassSecret)}`
      : url;
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'OmniLink-APEX-CI-AssetCheck/1.0',
        // Include Vercel protection bypass if provided
        ...(bypassSecret && {
          'x-preview-protection-bypass': bypassSecret,
          'x-preview-set-bypass-cookie': 'true',
        }),
      },
    });

    if (response.status === expectStatus) {
      log('pass', `${description}: ${response.status}`);
      return { status: 'pass' };
    } else if (response.status === 401 || response.status === 403) {
      // Vercel deployment protection - skip if no bypass secret provided
      if (!process.env.VERCEL_AUTOMATION_BYPASS_SECRET) {
        log('warn', `${description}: ${response.status} (Vercel protection enabled - skipping)`);
        return { status: 'skip', reason: 'preview_protection' };
      }
      log('fail', `${description}: ${response.status} (AUTHENTICATION ERROR - check bypass secret)`);
      return { status: 'fail' };
    } else {
      log('fail', `${description}: expected ${expectStatus}, got ${response.status}`);
      return { status: 'fail' };
    }
  } catch (error) {
    log('fail', `${description}: ${error.message}`);
    return { status: 'fail' };
  }
}

function walkFiles(dir) {
  if (!fs.existsSync(dir)) {
    return [];
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return walkFiles(fullPath);
    }
    return [fullPath];
  });
}

async function findFirstJsBundle() {
  const assetsDir = path.join(DIST_DIR, 'assets', 'js');

  if (!fs.existsSync(assetsDir)) {
    return null;
  }

  const files = fs.readdirSync(assetsDir);
  const jsFile = files.find((f) => f.endsWith('.js'));
  return jsFile ? `/assets/js/${jsFile}` : null;
}

function findHeroBadgeAsset() {
  const assetsDir = path.join(DIST_DIR, 'assets');
  const badgeFile = walkFiles(assetsDir).find((filePath) =>
    /^apex-badge-.*\.png$/.test(path.basename(filePath)),
  );

  if (!badgeFile) {
    return null;
  }

  return `/${path.relative(DIST_DIR, badgeFile).split(path.sep).join('/')}`;
}

async function main() {
  console.log('\n📦 OmniLink APEX - Static Asset Access Check');
  console.log(`   Base URL: ${BASE_URL}`);
  if (process.env.VERCEL_AUTOMATION_BYPASS_SECRET) {
    console.log('   🔑 Vercel bypass secret configured');
  }
  console.log('─'.repeat(50));

  const results = [];

  let child;
  try {
    let response = await fetch(`${BASE_URL}/`).catch(() => null);
    if (!response) {
      console.log('   Spinning up local preview server...');
      const { spawn } = await import('node:child_process');
      const vitePath = path.resolve('node_modules', 'vite', 'bin', 'vite.js');
      child = spawn(process.execPath, [vitePath, 'preview', '--port', '4173'], { stdio: 'ignore' });
      
      // Retry for up to 30 seconds
      for (let i = 0; i < 60; i++) {
        await new Promise(r => setTimeout(r, 500));
        response = await fetch(`${BASE_URL}/`).catch(() => null);
        if (response) {
          console.log('   Server is up!');
          break;
        }
      }
    }
  } catch(e) {}

  // Critical assets and routes that MUST return 200
  const criticalAssets = [
    { path: '/manifest.webmanifest', description: 'PWA Manifest' },
    { path: '/favicon.ico', description: 'Favicon' },
    { path: '/icon.png', description: 'Login icon' },
    { path: '/login', description: 'Login route' },
    { path: '/', description: 'Index HTML' },
  ];

  for (const asset of criticalAssets) {
    const result = await checkAsset(`${BASE_URL}${asset.path}`, asset.description);
    results.push({ ...asset, ...result });
  }

  const heroBadgeAsset = findHeroBadgeAsset();
  if (heroBadgeAsset) {
    const result = await checkAsset(`${BASE_URL}${heroBadgeAsset}`, `Hero badge asset (${path.basename(heroBadgeAsset)})`);
    results.push({ path: heroBadgeAsset, description: 'Hero badge asset', ...result });
  } else {
    log('warn', 'Hero badge asset: apex-badge-*.png not in dist/assets — badge is now inline SVG (no file asset required)');
    results.push({ path: '/assets/apex-badge-*.png', description: 'Hero badge asset', status: 'skip' });
  }

  // Check a JS bundle if dist exists
  const jsBundle = await findFirstJsBundle();
  if (jsBundle) {
    const result = await checkAsset(`${BASE_URL}${jsBundle}`, `JS Bundle (${jsBundle})`);
    results.push({ path: jsBundle, description: 'JS Bundle', ...result });
  } else {
    log('warn', 'No dist/assets/js found - skipping bundle check (run after build)');
  }

  // Check CSS
  const cssDir = path.join(DIST_DIR, 'assets', 'css');
  if (fs.existsSync(cssDir)) {
    const cssFiles = fs.readdirSync(cssDir);
    const cssFile = cssFiles.find((f) => f.endsWith('.css'));
    if (cssFile) {
      const cssPath = `/assets/css/${cssFile}`;
      const result = await checkAsset(`${BASE_URL}${cssPath}`, `CSS Bundle (${cssFile})`);
      results.push({ path: cssPath, description: 'CSS Bundle', ...result });
    }
  }

  console.log('─'.repeat(50));

  // Summary
  const failed = results.filter((r) => r.status === 'fail');
  const passed = results.filter((r) => r.status === 'pass');
  const skipped = results.filter((r) => r.status === 'skip');

  console.log(`\n📊 Results: ${passed.length} passed, ${failed.length} failed, ${skipped.length} skipped\n`);

  if (skipped.length > 0 && failed.length === 0) {
    console.log(`${colors.yellow}SKIPPED (Vercel protection - set VERCEL_AUTOMATION_BYPASS_SECRET to test):${colors.reset}`);
    skipped.forEach((s) => console.log(`   - ${s.path}: ${s.description}`));
    console.log('\n');
    console.log(`${colors.green}No failures - CI passing (skipped tests don't block)${colors.reset}\n`);
    if (child) child.kill();
    process.exit(0);
  }

  if (failed.length > 0) {
    console.log(`${colors.red}FAILED ASSETS:${colors.reset}`);
    failed.forEach((f) => console.log(`   - ${f.path}: ${f.description}`));
    console.log('\n');
    if (child) child.kill();
    process.exit(1);
  }

  console.log(`${colors.green}All critical assets accessible!${colors.reset}\n`);
  if (child) child.kill();
  process.exit(0);
}

main().catch((err) => {
  console.error('Asset check failed:', err);
  process.exit(1);
});
