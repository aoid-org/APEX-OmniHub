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
const SKIN = resolve(ROOT, 'apps/omnihub-site/dashboard/omniSkin.css');
const TAILWIND = resolve(ROOT, 'tailwind.config.ts');

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

  // ── Canonical layout contract (owner P1 regression repair, supersedes #1516) ─
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
    'SidebarKpiBar (System KPIs) must remain in the left sidebar footer');
  check('LanguageSelector surfaced in header', /<LanguageSelector\b/.test(src),
    'language switcher must remain in the OmniDash header');

  // ── Owner P1 invariants (replace, do NOT extend, the #1516 mistake) ─────────
  // 1) System Health surface MUST remain present (NOT removed as a substitute
  //    for SidebarKpiBar). SystemHealthRow is the real system-health surface.
  check('SystemHealthRow imported and rendered (System Health surface present)',
    /import\s*\{\s*SystemHealthRow\s*\}/.test(src) && /<SystemHealthRow/.test(src),
    'System Health must remain a real surface in the rail — restore <SystemHealthRow>');
  // 2) Observability must be REMOVED from the main dashboard canvas.
  check('Observability removed from main canvas (no toggle / M03 panels)',
    !/<ObservabilityToggle/.test(src) && !/M03ObservabilityPanels/.test(src),
    'Observability must not render in the main canvas — it is footer-only');
  // 3) Observability/status is footer-only and rendered exactly once.
  const footerObsCount = (src.match(/<FooterObservabilityRow/g) || []).length;
  check('FooterObservabilityRow rendered exactly once (footer-only observability)',
    /import\s*\{\s*FooterObservabilityRow\s*\}/.test(src) && footerObsCount === 1,
    `FooterObservabilityRow must render exactly once (found ${footerObsCount})`);
  // 4) Footer observability is fixed/clipped/immovable: it lives inside the
  //    static .omni-footer-bar (overflow:hidden) and is NOT wrapped in a
  //    DraggableWidget.
  check('footer bar clips its content (overflow:hidden)',
    /className="omni-footer-bar"[\s\S]{0,260}overflow:\s*["']hidden["']/.test(src),
    '.omni-footer-bar must set overflow:"hidden" to clip the observability strip');
  check('FooterObservabilityRow is not draggable/reorderable',
    !/<DraggableWidget[^>]*>\s*<FooterObservabilityRow/.test(src),
    'footer observability must not be wrapped in a DraggableWidget');
  // 5) OmniSlate prompt input test id must remain (accessibility/usability gate).
  check('OmniSlate prompt input test id present',
    /data-testid="omnislate-prompt-input"/.test(src),
    'OmniSlate prompt input (data-testid="omnislate-prompt-input") must remain');
}

// ── Rail-width parity: left and right rails MUST share one width token ───────
check('omniSkin.css exists', existsSync(SKIN));
if (existsSync(SKIN)) {
  const css = readFileSync(SKIN, 'utf8');
  check('left/right rails share a single width token (--omni-rail-width)',
    /\.omni-sidebar\s*,\s*\.omni-right-panel\s*\{[^}]*var\(--omni-rail-width/.test(css),
    '.omni-sidebar and .omni-right-panel must both read width: var(--omni-rail-width)');
}

// ── Glass/tile integrity: dashboard Tailwind utilities MUST be generated ─────
// The production entry is the ROOT app (src/main.tsx). OmniMedia/right-rail tiles
// use Tailwind utilities that only exist in the bundle if the dashboard tree is
// scanned. Missing glob = surfaces collapse into plain text (owner items 8/9).
check('root tailwind.config.ts exists', existsSync(TAILWIND));
if (existsSync(TAILWIND)) {
  const tw = readFileSync(TAILWIND, 'utf8');
  check('Tailwind scans the live OmniDash dashboard tree (glass/tile generation)',
    /apps\/omnihub-site\/dashboard\/\*\*/.test(tw),
    'add "./apps/omnihub-site/dashboard/**/*.{ts,tsx}" to tailwind.config.ts content globs');
}
console.log(`\n  ${passed} passed, ${failed} failed\n`);
if (failed > 0) { console.error('[APEX OmniDash] INTEGRITY FAILURE\n'); process.exit(1); }
console.log('[APEX OmniDash] All invariants satisfied.\n');
