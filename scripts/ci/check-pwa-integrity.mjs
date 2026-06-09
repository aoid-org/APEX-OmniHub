#!/usr/bin/env node
/**
 * APEX PWA Integrity Guard
 *
 * Fails CI if any of the five load-bearing PWA invariants are missing or broken.
 * Run: node scripts/ci/check-pwa-integrity.mjs
 *
 * INVARIANTS CHECKED:
 *  1. manifest.webmanifest exists in the public directory
 *  2. sw.js static service worker exists in the public directory
 *  3. index.html links <manifest.webmanifest>
 *  4. src/main.tsx registers the service worker
 *  5. App.tsx imports and renders <PWAInstallBanner>
 *
 * Any failure here means the PWA install banner will be silently broken on the live site.
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
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

console.log('\n[APEX PWA Integrity Guard]\n');

// ── 1. Manifest ────────────────────────────────────────────────────────────
const manifestPath = resolve(ROOT, 'apps/omnihub-site/public/manifest.webmanifest');
check(
  'manifest.webmanifest exists',
  existsSync(manifestPath),
  'create apps/omnihub-site/public/manifest.webmanifest'
);

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
    check(
      'manifest has 192px icon',
      Array.isArray(manifest.icons) &&
        manifest.icons.some((i) => String(i.sizes).includes('192')),
      'add an icon entry with sizes "192x192"'
    );
    check(
      'manifest has 512px icon',
      Array.isArray(manifest.icons) &&
        manifest.icons.some((i) => String(i.sizes).includes('512')),
      'add an icon entry with sizes "512x512"'
    );
  }
}

// ── 2. Service Worker ──────────────────────────────────────────────────────
const swPath = resolve(ROOT, 'apps/omnihub-site/public/sw.js');
check(
  'sw.js exists in public/',
  existsSync(swPath),
  'create apps/omnihub-site/public/sw.js'
);

// ── 3. index.html manifest link ────────────────────────────────────────────
const indexPath = resolve(ROOT, 'index.html');
check(
  'index.html links manifest.webmanifest',
  fileContains(indexPath, 'manifest.webmanifest'),
  'add <link rel="manifest" href="/manifest.webmanifest"> to index.html'
);

// ── 4. SW registration in src/swInit.ts (extracted for testability) ──────
const swInitPath = resolve(ROOT, 'src/swInit.ts');
check(
  'src/swInit.ts exists and registers service worker',
  fileContains(swInitPath, "serviceWorker.register"),
  "restore registerServiceWorker() in src/swInit.ts"
);
const mainTsxPath = resolve(ROOT, 'src/main.tsx');
check(
  'src/main.tsx calls registerServiceWorker()',
  fileContains(mainTsxPath, "registerServiceWorker"),
  "import and call registerServiceWorker() from ./swInit in src/main.tsx"
);

// ── 5. PWAInstallBanner in App.tsx ─────────────────────────────────────────
const appTsxPath = resolve(ROOT, 'apps/omnihub-site/src/App.tsx');
check(
  'App.tsx imports PWAInstallBanner',
  fileContains(appTsxPath, 'PWAInstallBanner'),
  'import and render <PWAInstallBanner /> in App.tsx'
);

// ── Result ─────────────────────────────────────────────────────────────────
console.log(`\n  ${passed} passed, ${failed} failed\n`);

if (failed > 0) {
  console.error(
    '[APEX PWA] INTEGRITY FAILURE: The PWA install banner will be broken on the live site.\n' +
    '  Fix all failures above before merging.\n'
  );
  process.exit(1);
}

console.log('[APEX PWA] All invariants satisfied. Install banner is live-ready.\n');
