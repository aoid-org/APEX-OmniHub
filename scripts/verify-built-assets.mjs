#!/usr/bin/env node
/**
 * verify-built-assets.mjs
 *
 * Regression test: parses dist/index.html and verifies every referenced
 * CSS and JS asset exists on disk. Fails if any referenced file is missing.
 *
 * Usage:
 *   npm run build && node scripts/verify-built-assets.mjs
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const DIST_DIR = join(process.cwd(), 'dist');
const INDEX_HTML = join(DIST_DIR, 'index.html');

// --- Preflight ---
if (!existsSync(INDEX_HTML)) {
  console.error('FAIL: dist/index.html does not exist. Run `npm run build` first.');
  process.exit(1);
}

const html = readFileSync(INDEX_HTML, 'utf-8');

// Extract all asset references from HTML
const assetPattern = /(?:src|href)=["'](\/?assets\/[^"']+\.(css|js))["']/g;
const assets = [];
let match;
while ((match = assetPattern.exec(html)) !== null) {
  assets.push(match[1]);
}

if (assets.length === 0) {
  console.error('FAIL: No /assets/*.css or /assets/*.js references found in dist/index.html');
  process.exit(1);
}

console.log(`Found ${assets.length} asset reference(s) in dist/index.html:\n`);

let failures = 0;

for (const assetPath of assets) {
  // Normalize: remove leading slash
  const relativePath = assetPath.replace(/^\//, '');
  const fullPath = join(DIST_DIR, relativePath);
  const exists = existsSync(fullPath);

  if (exists) {
    console.log(`  OK   ${assetPath} -> ${relativePath}`);
  } else {
    console.error(`  FAIL ${assetPath} -> ${relativePath} (FILE NOT FOUND)`);
    failures++;
  }
}

console.log('');

if (failures > 0) {
  console.error(`FAIL: ${failures} referenced asset(s) missing from dist/`);
  console.error('This will cause MIME-type errors in production (HTML served instead of CSS/JS).');
  process.exit(1);
}

// --- Verify _redirects has SPA catch-all (Cloudflare Pages) ---
const redirectsPath = join(process.cwd(), 'public', '_redirects');
if (existsSync(redirectsPath)) {
  const content = readFileSync(redirectsPath, 'utf-8');
  const hasSPACatchAll = content.split('\n').some(line =>
    /^\/\*\s+\/index\.html\s+200/.test(line.trim())
  );

  if (hasSPACatchAll) {
    // Cloudflare Pages serves static assets directly before applying _redirects,
    // so /assets/* files are never caught by the SPA fallback.
    console.log('OK: Cloudflare Pages _redirects has SPA catch-all (static assets served directly).');
  } else {
    console.error('FAIL: _redirects is missing SPA catch-all: /* /index.html 200');
    process.exit(1);
  }
}

console.log('ALL CHECKS PASSED: Every referenced asset exists on disk.');
process.exit(0);
