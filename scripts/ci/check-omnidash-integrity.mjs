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

  // ── Canonical layout contract (PR #1516 — owner-approved, drift-proof) ──────
  // Full record: APEX_SURFACE_REGISTRY.md "Canonical Layout Law".
  check('App Gallery uses 4-column horizontal grid',
    /gridTemplateColumns:\s*['"]repeat\(4,\s*minmax\(0,\s*1fr\)\)['"]/.test(src),
    'App Gallery must render four horizontal slots: repeat(4, minmax(0, 1fr))');
  check('App Gallery label is "App Gallery"', /<SectionLabel>App Gallery<\/SectionLabel>/.test(src),
    'gallery label must read "App Gallery"');
  check('no Connect affordance in shell', !/Connect App|\+\s*Connect App/.test(src),
    'App Gallery must not show a Connect CTA');
  check('PrimaryKpiBand not imported', !/import\s*\{[^}]*PrimaryKpiBand[^}]*\}/.test(src),
    'Primary Metrics band removed — do not reintroduce PrimaryKpiBand');
  check('PrimaryKpiBand not rendered', !/<PrimaryKpiBand/.test(src),
    'Primary Metrics band removed — do not render <PrimaryKpiBand>');
  check('OmniSlate scrollIntoView guarded against on-mount fire',
    /if\s*\(\s*messages\.length\s*===\s*0\s*\)\s*return;/.test(src),
    'guard endRef.scrollIntoView with `if (messages.length === 0) return;`');
  check('blueprint grid + wordmark are position:fixed (static wallpaper)',
    (src.match(/position:\s*["']fixed["']/g) || []).length >= 2,
    'wallpaper grid and wordmark watermark must both be position:fixed');
  check('SidebarKpiBar imported and rendered',
    /import\s*\{\s*SidebarKpiBar\s*\}/.test(src) && /<SidebarKpiBar/.test(src),
    'SidebarKpiBar must remain in the left sidebar footer');
  check('SystemHealthRow not rendered in shell', !/<SystemHealthRow/.test(src),
    'right-rail SystemHealthRow removed — KPIs live in SidebarKpiBar');
  check('LanguageSelector surfaced in header', /<LanguageSelector\b/.test(src),
    'language switcher must remain in the OmniDash header');
}
console.log(`\n  ${passed} passed, ${failed} failed\n`);
if (failed > 0) { console.error('[APEX OmniDash] INTEGRITY FAILURE\n'); process.exit(1); }
console.log('[APEX OmniDash] All invariants satisfied.\n');
