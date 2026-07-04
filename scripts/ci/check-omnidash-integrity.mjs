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

  // ── Owner P1 follow-up invariants (logo placement, width parity, footer-fixed) ─
  // 6) Brand logo sits in the canvas content flow BELOW the App Gallery. Source
  //    order == flow order, so the canvas logo must appear after the App Gallery
  //    render. It must not be a DraggableWidget (in-flow, non-interactive).
  const galleryIdx = src.indexOf('id="widget_apps"');
  const canvasLogoIdx = src.indexOf('data-testid="omnidash-canvas-logo"');
  check('canvas brand logo present and rendered below the App Gallery',
    canvasLogoIdx !== -1 && galleryIdx !== -1 && canvasLogoIdx > galleryIdx,
    'add the canvas brand logo (data-testid="omnidash-canvas-logo") in the content flow AFTER the App Gallery');
  check('canvas brand logo is in-flow, not a DraggableWidget',
    !/<DraggableWidget[^>]*>\s*<div[^>]*data-testid="omnidash-canvas-logo"/.test(src),
    'canvas brand logo must be an in-flow element, never wrapped in a DraggableWidget');

  // 7) KPI/status EXACT inner-width parity: both rails inset their KPI/status
  //    block by the shared --omni-rail-pad-x token, and the sidebar footer adds
  //    no extra horizontal padding — so SidebarKpiBar and SystemHealthRow share
  //    one inner content width (rail − 2·pad-x) at every breakpoint.
  check('left rail insets by the shared --omni-rail-pad-x token',
    /padding:\s*["']10px var\(--omni-rail-pad-x(?:,\s*12px)?\) 0["']/.test(src),
    'left sidebar horizontal padding must read var(--omni-rail-pad-x, 12px)');
  check('right rail insets by the shared --omni-rail-pad-x token',
    /padding:\s*["']14px var\(--omni-rail-pad-x(?:,\s*12px)?\)["']/.test(src),
    'right panel horizontal padding must read var(--omni-rail-pad-x, 12px)');
  check('sidebar footer adds no horizontal padding (System KPIs spans rail inner box)',
    /omni-sidebar-footer[\s\S]{0,140}padding:\s*["']12px 0 20px["']/.test(src),
    'omni-sidebar-footer horizontal padding must be 0 so SidebarKpiBar matches SystemHealthRow width');

  // 8) Footer is truly viewport-fixed: the shell root is a full-viewport-height
  //    flex column that clips, and the footer bar never compresses (flexShrink:0)
  //    — so it is permanently pinned to the bottom of the viewport.
  check('shell root is a clipped full-viewport-height flex column',
    /height:\s*["']100dvh["']/.test(src) && /flexDirection:\s*["']column["']/.test(src) && /overflow:\s*["']hidden["']/.test(src),
    'shell root must set height:"100dvh", flexDirection:"column", overflow:"hidden" to pin the footer');
  check('footer bar never compresses (flexShrink:0) — pinned to viewport bottom',
    /className="omni-footer-bar"[\s\S]{0,160}flexShrink:\s*0/.test(src),
    '.omni-footer-bar must set flexShrink:0 so it stays pinned at the viewport bottom');
}

// ── Rail-width parity: left and right rails MUST share one width token ───────
// CRITICAL: the rules must live in a stylesheet that the PRODUCTION entry
// (root src/main.tsx, per index.html) actually imports.
const LAYOUT_CSS = resolve(ROOT, 'apps/omnihub-site/src/styles/omnidash-layout.css');
const ROOT_MAIN = resolve(ROOT, 'src/main.tsx');
check('runtime-loaded layout stylesheet exists (omnidash-layout.css)', existsSync(LAYOUT_CSS));
if (existsSync(LAYOUT_CSS)) {
  const css = readFileSync(LAYOUT_CSS, 'utf8');
  check('left/right rails share a single width token (--omni-rail-width) in the LOADED stylesheet',
    /\.omni-sidebar\s*,\s*\.omni-right-panel\s*\{[^}]*var\(--omni-rail-width/.test(css),
    '.omni-sidebar and .omni-right-panel must read width: var(--omni-rail-width) in omnidash-layout.css (the loaded stylesheet)');
  check('shared rail horizontal-inset token defined (--omni-rail-pad-x) in the LOADED stylesheet',
    /--omni-rail-pad-x\s*:/.test(css),
    'define --omni-rail-pad-x in omnidash-layout.css so both rails inset their KPI/status block equally at runtime');
}
// And that stylesheet must actually be imported by the production root entry.
if (existsSync(ROOT_MAIN)) {
  const rootMainSrc = readFileSync(ROOT_MAIN, 'utf8');
  check('omnidash-layout.css is imported by the production root entry (src/main.tsx)',
    /omnidash-layout\.css/.test(rootMainSrc),
    'root src/main.tsx must import omnidash-layout.css so the rail-parity rules reach the production bundle');

  // omniSkin.css (keyframes, .ose-avatar-button, .ose-icon-button,
  // .ose-integrated-apps-gallery) was for a long time imported only by the
  // orphaned apps/omnihub-site/src/main.tsx (never used as an entry — index.html
  // loads root src/main.tsx), so none of its rules ever reached production: the
  // header avatar/icon buttons rendered as unstyled text, and every OSE
  // keyframe animation (apexPulse, navGlow, ringBreath, scanLine, etc.) was
  // silently absent from the shipped bundle. Regression-guard the fix.
  const OMNI_SKIN_CSS = resolve(ROOT, 'apps/omnihub-site/dashboard/omniSkin.css');
  check('omniSkin.css static asset exists', existsSync(OMNI_SKIN_CSS));
  check('omniSkin.css is imported by the production root entry (src/main.tsx)',
    /omniSkin\.css/.test(rootMainSrc),
    'root src/main.tsx must import apps/omnihub-site/dashboard/omniSkin.css so its keyframes and .ose-* component classes reach the production bundle');
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

// ── Footer data honesty (reviewer item 4) ───────────────────────────────────
// The footer observability strip must show only genuine system/observability
// signals. FlowBills business KPIs (flowbills_demos / flowbills_paid_accounts)
// must NOT be mislabelled as telemetry ("Events"/"Loops").
const FOOTER = resolve(ROOT, 'apps/omnihub-site/dashboard/components/FooterObservabilityRow.tsx');
check('FooterObservabilityRow exists', existsSync(FOOTER));
if (existsSync(FOOTER)) {
  const f = readFileSync(FOOTER, 'utf8');
  check('footer shows no FlowBills business KPI as telemetry (honest data)',
    !/label="Events"/.test(f) && !/label="Loops"/.test(f) && !/flowbills_/.test(f),
    'footer must not render flowbills_* as "Events"/"Loops" — use real signals only');
}
console.log(`\n  ${passed} passed, ${failed} failed\n`);
if (failed > 0) { console.error('[APEX OmniDash] INTEGRITY FAILURE\n'); process.exit(1); }
console.log('[APEX OmniDash] All invariants satisfied.\n');
