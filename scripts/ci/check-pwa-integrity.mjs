#!/usr/bin/env node
/**
 * APEX PWA Integrity Guard
 * Verifies source invariants and, when dist/ exists, built PWA artifacts.
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');

let passed = 0;
let failed = 0;

function check(label, condition, detail = '') {
  if (condition) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`);
    failed++;
  }
}

function fileContains(filePath, ...patterns) {
  if (!existsSync(filePath)) return false;
  const content = readFileSync(filePath, 'utf8');
  return patterns.every((p) => content.includes(p));
}

function readIfExists(filePath) {
  return existsSync(filePath) ? readFileSync(filePath, 'utf8') : '';
}

function collectJs(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...collectJs(full));
    if (entry.isFile() && entry.name.endsWith('.js')) out.push(full);
  }
  return out;
}

function hasServiceWorkerRegistration(text) {
  return text.includes('serviceWorker.register("/sw.js")') ||
    text.includes("serviceWorker.register('/sw.js')") ||
    /serviceWorker\.register\(\s*[`'"]\/sw\.js[`'"]/.test(text);
}

console.log('\n[APEX PWA Integrity Guard]\n');

const manifestPath = resolve(ROOT, 'apps/omnihub-site/public/manifest.webmanifest');
check('manifest.webmanifest exists', existsSync(manifestPath), 'create apps/omnihub-site/public/manifest.webmanifest');

if (existsSync(manifestPath)) {
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  } catch {
    check('manifest.webmanifest is valid JSON', false, 'JSON parse error');
    manifest = null;
  }
  if (manifest) {
    check('manifest has name', typeof manifest.name === 'string' && manifest.name.length > 0);
    check('manifest has start_url', typeof manifest.start_url === 'string');
    check('manifest has 192px icon', Array.isArray(manifest.icons) && manifest.icons.some((i) => String(i.sizes).includes('192')), 'add an icon entry with sizes "192x192"');
    check('manifest has 512px icon', Array.isArray(manifest.icons) && manifest.icons.some((i) => String(i.sizes).includes('512')), 'add an icon entry with sizes "512x512"');
  }
}

const swPath = resolve(ROOT, 'apps/omnihub-site/public/sw.js');
check('sw.js exists in public/', existsSync(swPath), 'create apps/omnihub-site/public/sw.js');

const indexPath = resolve(ROOT, 'index.html');
check('index.html links manifest.webmanifest', fileContains(indexPath, 'manifest.webmanifest'), 'add <link rel="manifest" href="/manifest.webmanifest"> to index.html');

const swInitPath = resolve(ROOT, 'src/swInit.ts');
check('src/swInit.ts exists and registers service worker', fileContains(swInitPath, 'serviceWorker.register'), 'restore registerServiceWorker() in src/swInit.ts');
const mainTsxPath = resolve(ROOT, 'src/main.tsx');
check('src/main.tsx calls registerServiceWorker()', fileContains(mainTsxPath, 'registerServiceWorker'), 'import and call registerServiceWorker() from ./swInit in src/main.tsx');

const appTsxPath = resolve(ROOT, 'apps/omnihub-site/src/App.tsx');
check('App.tsx imports PWAInstallBanner', fileContains(appTsxPath, 'PWAInstallBanner'), 'import and render <PWAInstallBanner /> in App.tsx');

const distPath = resolve(ROOT, 'dist');
if (existsSync(distPath)) {
  console.log('\n[APEX PWA Dist Artifact Guard]\n');
  const distIndex = resolve(distPath, 'index.html');
  const distManifest = resolve(distPath, 'manifest.webmanifest');
  const distSw = resolve(distPath, 'sw.js');
  check('dist/index.html contains manifest link', /<link[^>]+rel=["']manifest["'][^>]*>/i.test(readIfExists(distIndex)), 'build output must link the web manifest');
  check('dist/manifest.webmanifest exists', existsSync(distManifest), 'build output must include manifest.webmanifest');
  if (existsSync(distManifest)) {
    try {
      JSON.parse(readFileSync(distManifest, 'utf8'));
      check('dist/manifest.webmanifest parses', true);
    } catch {
      check('dist/manifest.webmanifest parses', false, 'JSON parse error');
    }
  }
  check('dist/sw.js exists', existsSync(distSw), 'build output must include sw.js');
  const builtJs = collectJs(resolve(distPath, 'assets')).map(readIfExists).join('\n');
  check('built JS registers /sw.js', hasServiceWorkerRegistration(builtJs), 'built JS must call serviceWorker.register("/sw.js")');
}

console.log(`\n  ${passed} passed, ${failed} failed\n`);

if (failed > 0) {
  console.error('[APEX PWA] INTEGRITY FAILURE: The PWA install banner will be broken on the live site.\n  Fix all failures above before merging.\n');
  process.exit(1);
}

console.log('[APEX PWA] All invariants satisfied. Install banner is live-ready.\n');
