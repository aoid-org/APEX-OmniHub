#!/usr/bin/env node
/**
 * APEX OmniDash Integrity Guard
 * Fails CI if load-bearing OmniDash constants are missing.
 * Run: node scripts/ci/check-omnidash-integrity.mjs
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SHELL = resolve(ROOT, 'apps/omnihub-site/dashboard/OmniDashShell.tsx');

let passed = 0, failed = 0;
function check(label, ok, fix = '') {
  if (ok) { console.log(`  ✓ ${label}`); passed++; }
  else     { console.error(`  ✗ ${label}${fix ? ` — ${fix}` : ''}`); failed++; }
}

console.log('\n[APEX OmniDash Integrity Guard]\n');
check('OmniDashShell.tsx exists', existsSync(SHELL));
if (existsSync(SHELL)) {
  const src = readFileSync(SHELL, 'utf8');
  check('DEMO_SLATE_MESSAGES defined', /const DEMO_SLATE_MESSAGES/.test(src),
    'restore const DEMO_SLATE_MESSAGES before OmniSlateWidget');
  check('DEMO_TRY_SUGGESTION defined', /const DEMO_TRY_SUGGESTION/.test(src),
    'restore const DEMO_TRY_SUGGESTION before OmniSlateWidget');
  check('OmniSlateWidget present', /const OmniSlateWidget/.test(src));
}
console.log(`\n  ${passed} passed, ${failed} failed\n`);
if (failed > 0) { console.error('[APEX OmniDash] INTEGRITY FAILURE — OmniDash will crash on load.\n'); process.exit(1); }
console.log('[APEX OmniDash] All invariants satisfied.\n');
