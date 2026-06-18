#!/usr/bin/env node
/**
 * APEX OmniDash Integrity Guard
 * Prevents the demo-seed regression (commit 3152f769) AND file corruption from
 * returning to OmniDashShell.tsx.
 * Run: node scripts/ci/check-omnidash-integrity.mjs
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SHELL = resolve(ROOT, 'apps/omnihub-site/dashboard/OmniDashShell.tsx');

let passed = 0, failed = 0;
function check(label, ok, fix = '') {
  if (ok) { console.log(`  PASS ${label}`); passed++; }
  else { console.error(`  FAIL ${label}${fix ? ` - ${fix}` : ''}`); failed++; }
}

console.log('\n[APEX OmniDash Integrity Guard]\n');
check('OmniDashShell.tsx exists', existsSync(SHELL));
if (existsSync(SHELL)) {
  const buf = readFileSync(SHELL);
  const src = buf.toString('utf8');
  // Corruption guards
  check('no NUL bytes (file not binary/corrupted)', !buf.includes(0),
    'OmniDashShell.tsx contains NUL bytes');
  check('no CRLF line endings (prevents whole-file churn)', !src.includes('\r'),
    'normalize OmniDashShell.tsx to LF');
  // Demo-regression guards (must stay OUT)
  check('DEMO_SLATE_MESSAGES absent', !/const DEMO_SLATE_MESSAGES/.test(src),
    'demo seed reintroduced (regression 3152f769)');
  check('DEMO_TRY_SUGGESTION absent', !/const DEMO_TRY_SUGGESTION/.test(src),
    'demo TRY suggestion reintroduced (regression 3152f769)');
  check('demo TRY chip absent', !/TRY: \{DEMO_TRY_SUGGESTION/.test(src),
    'demo TRY chip JSX reintroduced (regression 3152f769)');
  // Structural sanity
  check('OmniSlateWidget present', /const OmniSlateWidget/.test(src));
}
console.log(`\n  ${passed} passed, ${failed} failed\n`);
if (failed > 0) { console.error('[APEX OmniDash] INTEGRITY FAILURE\n'); process.exit(1); }
console.log('[APEX OmniDash] All invariants satisfied.\n');
