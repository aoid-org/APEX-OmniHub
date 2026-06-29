#!/usr/bin/env node
/**
 * APEX OmniDash Integrity Guard
 * Prevents layout/canvas regressions and post-1516 owner-contract drift.
 * Run: node scripts/ci/check-omnidash-integrity.mjs
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SHELL = resolve(ROOT, 'apps/omnihub-site/dashboard/OmniDashShell.tsx');
const CSS = resolve(ROOT, 'apps/omnihub-site/dashboard/omniSkin.css');
const SIDEBAR_KPI = resolve(ROOT, 'apps/omnihub-site/dashboard/components/SidebarKpiBar.tsx');

let passed = 0, failed = 0;
function check(label, ok, fix = '') {
  if (ok) { console.log(`  PASS ${label}`); passed++; }
  else { console.error(`  FAIL ${label}${fix ? ` - ${fix}` : ''}`); failed++; }
}

console.log('\n[APEX OmniDash Integrity Guard]\n');
check('OmniDashShell.tsx exists', existsSync(SHELL));
check('omniSkin.css exists', existsSync(CSS));
check('SidebarKpiBar.tsx exists', existsSync(SIDEBAR_KPI));
if (existsSync(SHELL) && existsSync(CSS) && existsSync(SIDEBAR_KPI)) {
  const buf = readFileSync(SHELL);
  const src = buf.toString('utf8');
  const css = readFileSync(CSS, 'utf8');
  const sidebarKpi = readFileSync(SIDEBAR_KPI, 'utf8');

  check('no NUL bytes (file not binary/corrupted)', !buf.includes(0), 'OmniDashShell.tsx contains NUL bytes');
  check('no CRLF line endings (prevents whole-file churn)', !src.includes('\r'), 'normalize OmniDashShell.tsx to LF');
  check('DEMO_SLATE_MESSAGES absent', !/const DEMO_SLATE_MESSAGES/.test(src), 'demo seed reintroduced (regression 3152f769)');
  check('DEMO_TRY_SUGGESTION absent', !/const DEMO_TRY_SUGGESTION/.test(src), 'demo TRY suggestion reintroduced (regression 3152f769)');
  check('demo TRY chip absent', !/TRY: \{DEMO_TRY_SUGGESTION/.test(src), 'demo TRY chip JSX reintroduced (regression 3152f769)');
  check('OmniSlateWidget present', /const OmniSlateWidget/.test(src));

  check('App Gallery uses 4-column horizontal grid', /gridTemplateColumns:\s*['"]repeat\(4,\s*minmax\(0,\s*1fr\)\)['"]/.test(src), 'App Gallery must render four horizontal slots');
  check('App Gallery label is "App Gallery"', /<SectionLabel>App Gallery<\/SectionLabel>/.test(src), 'gallery label must read "App Gallery"');
  check('no Connect affordance in shell', !/Connect App|\+\s*Connect App/.test(src), 'App Gallery must not show a Connect CTA');
  check('PrimaryKpiBand not imported', !/import\s*\{[^}]*PrimaryKpiBand[^}]*\}/.test(src), 'Primary Metrics band removed — do not reintroduce PrimaryKpiBand');
  check('PrimaryKpiBand not rendered', !/<PrimaryKpiBand/.test(src), 'Primary Metrics band removed — do not render <PrimaryKpiBand>');
  check('OmniSlate scrollIntoView guarded against on-mount fire', /if\s*\(\s*messages\.length\s*===\s*0\s*\)\s*return;/.test(src), 'guard endRef.scrollIntoView');
  check('blueprint grid + wordmark are position:fixed (static wallpaper)', (src.match(/position:\s*["']fixed["']/g) || []).length >= 2, 'wallpaper grid and wordmark watermark must both be position:fixed');

  // Corrected P1 owner contract.
  check('SystemHealthRow imported and rendered', /import\s*\{\s*SystemHealthRow\s*\}/.test(src) && /<SystemHealthRow\b/.test(src), 'System Health surface must remain present');
  check('SidebarKpiBar retained but not named SystemHealth replacement', /import\s*\{\s*SidebarKpiBar\s*\}/.test(src) && /<SidebarKpiBar/.test(src) && !/replacement for System Health|SystemHealth replacement/i.test(src), 'SidebarKpiBar is KPI/status parity only');
  check('Observability toggle removed from main canvas', !/ObservabilityToggle|<M03ObservabilityPanels\b/.test(src), 'Observability must not render in the old main-canvas M03 position');
  check('footer observability/status rendered exactly once', (src.match(/data-testid="omnidash-footer-observability"/g) || []).length === 1 && (src.match(/<FooterObservabilityStatus\b/g) || []).length === 1, 'footer observability/status row must render exactly once');
  check('footer observability is clipped in CSS', /\.omnidash-footer-observability\s*\{[\s\S]*overflow:\s*hidden[\s\S]*white-space:\s*nowrap/s.test(css), 'footer row must clip inside footer bounds');
  check('footer observability is immovable/non-draggable', !/<DraggableWidget[^>]*>\s*<FooterObservabilityStatus\b/s.test(src), 'footer status must not be wrapped in DraggableWidget');
  check('left/right rail widths share --omni-rail-width token', /\.omni-sidebar,\s*\n\.omni-right-panel\s*\{\s*width:\s*var\(--omni-rail-width/.test(css), 'left and right rails must share one width token');
  check('KPI/status width parity encoded', /data-testid="sidebar-kpi-bar"/.test(sidebarKpi) && /width:\s*100%/.test(css), 'SidebarKpiBar must match sibling rail width/inset');
  check('OmniSlate prompt input test id present', /data-testid="omnislate-prompt-input"/.test(src), 'OmniSlate prompt input must remain testable and accessible');
  check('LanguageSelector surfaced in header', /<LanguageSelector\b/.test(src), 'language switcher must remain in the OmniDash header');
}
console.log(`\n  ${passed} passed, ${failed} failed\n`);
if (failed > 0) { console.error('[APEX OmniDash] INTEGRITY FAILURE\n'); process.exit(1); }
console.log('[APEX OmniDash] All invariants satisfied.\n');
