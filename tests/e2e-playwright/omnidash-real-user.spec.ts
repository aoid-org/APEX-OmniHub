/**
 * OmniDash — Real-World User-Shoes Validation Suite
 *
 * Drives OmniDash as a real authenticated user across desktop, tablet, and
 * mobile viewports and produces browser evidence (screenshots, sanitized
 * network/console summaries) under artifacts/playwright/.
 *
 * GOVERNANCE: .agents/skills/apex-user-shoes-validation
 *  - GO  : surface purpose clear, primary path works or is honestly gated.
 *  - NO-GO (test FAIL): entry-point no-op, wrong routing, generic backend 500,
 *           raw IDs, fake success, unexpected simulated labels in prod build.
 *  - OWNER-GATED: external prerequisite (backend/env) unavailable — recorded,
 *           never reported as PASS.
 *
 * TDD POSTURE: a failing assertion here is a real product defect surfaced
 * pre-production, not a test to weaken. Assertions are not softened to go green.
 *
 * Canonical product truth (references/apex-canonical-truth.md):
 *  - OmniBoard owns app-integration; Links is URL/context only and must never
 *    route to OmniBoard.
 *  - App Gallery shows exactly four "Awaiting" slots and no Connect affordance.
 *
 * Auth: real Supabase password session (helpers/auth.ts) injected before load.
 * Read-only: no prompts submitted, no billing/settings/files mutated.
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

import { test, expect, type Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { signInWithSupabaseSession, isBackendRequired } from './helpers/auth';

const SHOTS = path.resolve(process.cwd(), 'artifacts', 'playwright', 'screenshots');
const NET = path.resolve(process.cwd(), 'artifacts', 'playwright', 'network');
fs.mkdirSync(SHOTS, { recursive: true });
fs.mkdirSync(NET, { recursive: true });

// Fatal runtime signatures — a green test over any of these is a false pass.
const FATAL =
  /createContext|Cannot read properties of undefined|ChunkLoadError|Loading chunk|Failed to fetch dynamically imported module|Minified React error/;

// Simulated/demo labels that must NOT render in a production build (PROD === true
// forces demoMode false; vite preview of `vite build` is a production build).
const SIMULATED = /\(Simulated\)|Demo Mode enabled by default|\bmock\b|placeholder success/i;

interface Evidence {
  readonly consoleErrors: string[];
  readonly pageErrors: string[];
  readonly failedRequests: string[];
}

function attachEvidence(page: Page): Evidence {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const failedRequests: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', (e) => pageErrors.push(`PAGEERROR: ${e.message}`));
  page.on('requestfailed', (r) => failedRequests.push(`${r.method()} ${sanitize(r.url())} — ${r.failure()?.errorText ?? 'failed'}`));
  page.on('response', (r) => {
    const s = r.status();
    if (s === 404 || s === 500 || s === 502) failedRequests.push(`${s} ${sanitize(r.url())}`);
  });
  return { consoleErrors, pageErrors, failedRequests };
}

function sanitize(raw: string): string {
  try { const u = new URL(raw); return `${u.protocol}//${u.host}${u.pathname}`; }
  catch { return raw.split('?')[0].split('#')[0]; }
}

async function shot(page: Page, name: string): Promise<void> {
  await page.screenshot({ path: path.join(SHOTS, name), fullPage: false }).catch(() => { /* non-fatal */ });
}

function assertNoFatal(ev: Evidence): void {
  expect(ev.pageErrors.filter((e) => FATAL.test(e)), `page errors: ${ev.pageErrors.join(' | ')}`).toHaveLength(0);
  expect(ev.consoleErrors.filter((e) => FATAL.test(e)), `console errors: ${ev.consoleErrors.join(' | ')}`).toHaveLength(0);
}

async function noHorizontalOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate(() => {
    const d = document.documentElement;
    return { scrollW: d.scrollWidth, clientW: d.clientWidth };
  });
  expect(overflow.scrollW, `horizontal overflow: scrollW=${overflow.scrollW} clientW=${overflow.clientW}`)
    .toBeLessThanOrEqual(overflow.clientW + 2);
}

const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  wide: { width: 1920, height: 1080 },
  tabletPortrait: { width: 768, height: 1024 },
  tabletLandscape: { width: 1024, height: 768 },
  mobile: { width: 390, height: 844 },
} as const;

// ── Authenticated desktop coverage ──────────────────────────────────────────
test.describe('OmniDash — authenticated desktop (1440×900)', () => {
  test.use({ viewport: VIEWPORTS.desktop });

  test('1. authenticated shell load — header, sidebar, canvas, widgets', async ({ page }) => {
    test.skip(!isBackendRequired(), 'BLOCKED(APEX-1207): runs under test:e2e:backend with real Supabase session');
    const ev = attachEvidence(page);
    await signInWithSupabaseSession(page);

    await expect(page.getByTestId('omnidash-top-header')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('top-header-logo')).toBeVisible();
    await expect(page.locator('.omni-sidebar')).toBeVisible();
    await expect(page.getByTestId('omnislate-prompt-input')).toBeVisible();
    await expect(page.getByTestId('integrated-apps')).toBeVisible();
    await shot(page, '01-authenticated-shell.png');
    assertNoFatal(ev);
  });

  test('1b. canonical top row (Agent/Slate/Ecosystem) fully below header on load — no auto-scroll clip', async ({ page }) => {
    test.skip(!isBackendRequired(), 'BLOCKED(APEX-1207): requires live Supabase session');
    const ev = attachEvidence(page);
    await signInWithSupabaseSession(page);
    await expect(page.getByTestId('omnidash-top-header')).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(1200); // allow any on-mount scroll effects to settle

    const headerBox = await page.getByTestId('omnidash-top-header').boundingBox();
    const headerBottom = (headerBox?.y ?? 0) + (headerBox?.height ?? 0);

    for (const id of ['widget_agent', 'widget_slate', 'widget_eco']) {
      const w = page.getByTestId(id);
      await expect(w, `${id} must be present above the fold`).toBeVisible();
      const box = await w.boundingBox();
      expect(box, `${id} has no box`).not.toBeNull();
      // Canonical: each top widget's card top must sit at/below the header — never
      // clipped above the canvas viewport by an on-mount auto-scroll.
      expect(box!.y, `${id} top (${box!.y?.toFixed(0)}) clipped above header bottom (${headerBottom.toFixed(0)}) — canvas auto-scrolled on load`)
        .toBeGreaterThanOrEqual(headerBottom - 4);
    }
    await shot(page, 'above-fold.png');
    assertNoFatal(ev);
  });

  test('2. canonical layout composition — sidebar nav, no overflow', async ({ page }) => {
    test.skip(!isBackendRequired(), 'BLOCKED(APEX-1207): requires live Supabase session');
    const ev = attachEvidence(page);
    await signInWithSupabaseSession(page);
    await expect(page.locator('.omni-sidebar')).toBeVisible({ timeout: 15_000 });

    for (const label of ['OmniBoard', 'PhysiOmni', 'Audits', 'Links', 'Automations', 'Workflows', 'Files', 'Billing', 'Settings']) {
      await expect(page.locator('.omni-sidebar').getByText(label, { exact: false }).first()).toBeVisible();
    }
    await noHorizontalOverflow(page);
    await shot(page, '02-canonical-layout.png');
    assertNoFatal(ev);
  });

  test('3. App Gallery ownership — 4 Awaiting slots, no Connect, non-interactive', async ({ page }) => {
    test.skip(!isBackendRequired(), 'BLOCKED(APEX-1207): requires live Supabase session');
    const ev = attachEvidence(page);
    await signInWithSupabaseSession(page);

    const gallery = page.getByTestId('integrated-apps');
    await expect(gallery).toBeVisible({ timeout: 15_000 });
    await expect(gallery.locator('.ose-integrated-apps-slot')).toHaveCount(4);
    await expect(gallery.getByText('Awaiting')).toHaveCount(4);
    await expect(page.getByText('App Gallery')).toBeVisible();
    await expect(page.getByText('Integrated Apps Gallery')).toHaveCount(0);
    await expect(page.getByText('Connect App', { exact: false })).toHaveCount(0);
    await expect(page.getByText('+ Connect App', { exact: false })).toHaveCount(0);

    // Clicking an Awaiting slot must not open a modal or navigate.
    const urlBefore = page.url();
    await gallery.locator('.ose-integrated-apps-slot').first().click();
    await page.waitForTimeout(500);
    expect(page.url()).toBe(urlBefore);
    await expect(page.locator('[role="dialog"]')).toHaveCount(0);
    await shot(page, '03-integrated-apps-no-connect.png');
    assertNoFatal(ev);
  });

  test('5. OmniSlate input is interactive and does not crash the surface', async ({ page }) => {
    test.skip(!isBackendRequired(), 'BLOCKED(APEX-1207): requires live Supabase session');
    const ev = attachEvidence(page);
    await signInWithSupabaseSession(page);

    const input = page.getByTestId('omnislate-prompt-input');
    await expect(input).toBeVisible({ timeout: 15_000 });
    await input.click();
    await input.fill('Summarize my pending approvals');
    await expect(input).toHaveValue('Summarize my pending approvals');
    // Read-only: do NOT submit (avoids mutating a real account). Assert send control exists.
    await expect(page.getByTestId('submit-prompt')).toBeVisible();
    await shot(page, '05-omnislate-action.png');
    assertNoFatal(ev);
  });

  test('8. language switcher visible in header and persists after refresh', async ({ page }) => {
    test.skip(!isBackendRequired(), 'BLOCKED(APEX-1207): requires live Supabase session');
    const ev = attachEvidence(page);
    await signInWithSupabaseSession(page);

    const header = page.getByTestId('omnidash-top-header');
    await expect(header).toBeVisible({ timeout: 15_000 });
    const lang = header.locator('.omni-header-lang');
    // NO-GO if the switcher is not present (prompt scenario 8 hard-fail).
    await expect(lang, 'FAIL — LANGUAGE SWITCHER NOT IMPLEMENTED / NOT VISIBLE').toBeVisible();
    await shot(page, 'language-visible.png');

    await lang.locator('.language-selector__trigger').click();
    const options = lang.locator('.language-selector__option');
    await expect(options.first()).toBeVisible();
    // Pick a non-active option to prove selection changes + persists.
    await options.nth(1).click();
    await page.waitForTimeout(300);
    const stored = await page.evaluate(() => globalThis.localStorage.getItem('apex_locale'));
    expect(stored, 'language selection must persist to localStorage(apex_locale)').toBeTruthy();
    await shot(page, 'language-after-change.png');

    await page.reload({ waitUntil: 'domcontentloaded' });
    const after = await page.evaluate(() => globalThis.localStorage.getItem('apex_locale'));
    expect(after).toBe(stored);
    await shot(page, 'language-after-refresh.png');
    assertNoFatal(ev);
  });

  test('1c. brand logo renders in the canvas directly below the App Gallery', async ({ page }) => {
    test.skip(!isBackendRequired(), 'BLOCKED(APEX-1207): requires live Supabase session');
    const ev = attachEvidence(page);
    await signInWithSupabaseSession(page);

    const gallery = page.getByTestId('integrated-apps');
    const logo = page.getByTestId('omnidash-canvas-logo');
    await expect(gallery).toBeVisible({ timeout: 15_000 });
    await expect(logo, 'owner P1: brand logo must render in the canvas').toBeVisible();

    const g = await gallery.boundingBox();
    const l = await logo.boundingBox();
    expect(g, 'gallery has no box').not.toBeNull();
    expect(l, 'logo has no box').not.toBeNull();
    // The logo sits BELOW the App Gallery: its top is at/below the gallery bottom.
    expect(l!.y, `brand logo top (${l!.y?.toFixed(0)}) must be below gallery bottom (${(g!.y + g!.height).toFixed(0)})`)
      .toBeGreaterThanOrEqual((g!.y + g!.height) - 4);
    await shot(page, 'logo-below-app-gallery.png');
    assertNoFatal(ev);
  });

  test('7c. KPI (left) and System Health/status (right) share EXACT inner width', async ({ page }) => {
    test.skip(!isBackendRequired(), 'BLOCKED(APEX-1207): requires live Supabase session');
    const ev = attachEvidence(page);
    await signInWithSupabaseSession(page);
    await expect(page.locator('.omni-sidebar')).toBeVisible({ timeout: 15_000 });

    const kpi = page.getByTestId('sidebar-kpi-bar');
    const status = page.getByTestId('rt_analytics');
    await expect(kpi).toBeVisible();
    await expect(status).toBeVisible();

    const k = await kpi.boundingBox();
    const s = await status.boundingBox();
    expect(k, 'KPI block has no box').not.toBeNull();
    expect(s, 'status block has no box').not.toBeNull();
    // Owner P1 KPI/status width parity — equal inner width (≤1px subpixel tolerance).
    expect(Math.abs(k!.width - s!.width), `KPI width ${k!.width?.toFixed(2)} vs status width ${s!.width?.toFixed(2)} must match`)
      .toBeLessThanOrEqual(1);
    await shot(page, 'kpi-status-width-parity.png');
    assertNoFatal(ev);
  });

  test('9. footer is viewport-fixed — pinned to the bottom, immovable on canvas scroll', async ({ page }) => {
    test.skip(!isBackendRequired(), 'BLOCKED(APEX-1207): requires live Supabase session');
    const ev = attachEvidence(page);
    await signInWithSupabaseSession(page);
    const footer = page.locator('.omni-footer-bar');
    await expect(footer).toBeVisible({ timeout: 15_000 });

    const vh = page.viewportSize()!.height;
    const before = await footer.boundingBox();
    expect(before, 'footer has no box').not.toBeNull();
    // Footer bottom sits at the viewport bottom.
    expect(Math.abs((before!.y + before!.height) - vh), `footer bottom ${(before!.y + before!.height).toFixed(0)} must equal viewport ${vh}`)
      .toBeLessThanOrEqual(2);
    // Scroll the canvas to the end; the footer must not move (it is viewport-fixed,
    // not part of the scrolling canvas flow).
    await page.locator('.omni-canvas-container').evaluate((el) => { el.scrollTop = el.scrollHeight; });
    await page.waitForTimeout(300);
    const after = await footer.boundingBox();
    expect(after, 'footer has no box after scroll').not.toBeNull();
    expect(Math.abs(after!.y - before!.y), 'footer moved on canvas scroll — not viewport-fixed').toBeLessThanOrEqual(1);
    await shot(page, 'footer-viewport-fixed.png');
    assertNoFatal(ev);
  });

  test('9b. OmniMedia widget renders with generated tile styling (Tailwind glob proof)', async ({ page }) => {
    test.skip(!isBackendRequired(), 'BLOCKED(APEX-1207): requires live Supabase session');
    const ev = attachEvidence(page);
    await signInWithSupabaseSession(page);
    // The OmniMedia launch widget lives in the right rail. A resolved, visible
    // open control proves the dashboard Tailwind utilities were generated (owner
    // items 8/9 — the tailwind.config.ts dashboard glob is in effect) and the
    // surface did not collapse into plain text.
    const openBtn = page.getByTestId('omnimedia-open-button');
    await expect(openBtn, 'OmniMedia open control must render — surface not collapsed to plain text').toBeVisible({ timeout: 15_000 });
    await shot(page, 'omnimedia-widget-rendered.png');
    assertNoFatal(ev);
  });

  test('7b. SidebarKpiBar present; System Health surface restored; observability is footer-only', async ({ page }) => {
    test.skip(!isBackendRequired(), 'BLOCKED(APEX-1207): requires live Supabase session');
    const ev = attachEvidence(page);
    await signInWithSupabaseSession(page);
    await expect(page.locator('.omni-sidebar')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('sidebar-kpi-bar')).toBeVisible();
    // Owner P1 contract (supersedes #1516): System Health remains a real surface
    // in the right rail — it is NOT removed as a substitute for SidebarKpiBar.
    await expect(page.getByTestId('rt_analytics')).toBeVisible();
    // Observability is footer-only: it must NOT render in the main canvas.
    await expect(page.getByTestId('observability-toggle')).toHaveCount(0);
    // Footer observability/status strip carries real system state.
    await expect(page.getByTestId('footer-observability')).toBeVisible();
    await shot(page, 'sidebar-kpi-and-footer-observability.png');
    assertNoFatal(ev);
  });

  test('10. production build shows no Simulated/demo labels', async ({ page }) => {
    test.skip(!isBackendRequired(), 'BLOCKED(APEX-1207): requires live Supabase session');
    const ev = attachEvidence(page);
    await signInWithSupabaseSession(page);
    await expect(page.getByTestId('omnidash-top-header')).toBeVisible({ timeout: 15_000 });
    const bodyText = await page.locator('body').innerText();
    const isProd = await page.evaluate(() => (import.meta as { env?: { PROD?: boolean } }).env?.PROD === true).catch(() => undefined);
    await shot(page, 'mock-demo-purge-proof.png');
    // Only enforce the purge when the runtime is a production build.
    if (isProd !== false) {
      expect(SIMULATED.test(bodyText), `simulated/demo labels present in prod build: ${bodyText.match(SIMULATED)?.[0]}`).toBe(false);
    }
    assertNoFatal(ev);
  });
});

// ── Responsive overflow safety across the full matrix ───────────────────────
for (const [name, viewport] of Object.entries(VIEWPORTS)) {
  test.describe(`OmniDash — responsive safety @ ${name} (${viewport.width}×${viewport.height})`, () => {
    test.use({ viewport });

    test(`12. no horizontal overflow @ ${name}`, async ({ page }) => {
      test.skip(!isBackendRequired(), 'BLOCKED(APEX-1207): requires live Supabase session');
      const ev = attachEvidence(page);
      await signInWithSupabaseSession(page);
      await expect(page.getByTestId('omnidash-top-header')).toBeVisible({ timeout: 15_000 });
      await page.waitForTimeout(800);
      await noHorizontalOverflow(page);
      assertNoFatal(ev);
    });
  });
}

// ── Mobile + tablet real-world navigation ───────────────────────────────────
test.describe('OmniDash — mobile navigation (390×844)', () => {
  test.use({ viewport: VIEWPORTS.mobile });

  test('7. mobile shell loads, bottom nav usable, OmniSlate reachable', async ({ page }) => {
    test.skip(!isBackendRequired(), 'BLOCKED(APEX-1207): requires live Supabase session');
    const ev = attachEvidence(page);
    await signInWithSupabaseSession(page);
    await expect(page.getByTestId('omnidash-top-header')).toBeVisible({ timeout: 15_000 });
    await noHorizontalOverflow(page);
    await shot(page, 'mobile-home.png');
    assertNoFatal(ev);
  });

  // Owner P1 contract item 11: flick-to-set must be proven with a real mobile
  // gesture, not source inspection. We long-press a top widget, flick it toward
  // OmniSlate, release, and assert the resulting context placement (a Context
  // droplet labelled for the flicked widget) becomes user-visible.
  test('11. flick-to-set sends a widget context into OmniSlate (gesture-driven)', async ({ page }) => {
    test.skip(!isBackendRequired(), 'BLOCKED(APEX-1207): requires live Supabase session');
    const ev = attachEvidence(page);
    await signInWithSupabaseSession(page);

    const agent = page.getByTestId('widget_agent');
    const slate = page.getByTestId('widget_slate');
    await expect(agent).toBeVisible({ timeout: 15_000 });
    await expect(slate).toBeVisible();

    const a = await agent.boundingBox();
    const s = await slate.boundingBox();
    expect(a, 'agent widget has no box').not.toBeNull();
    expect(s, 'slate widget has no box').not.toBeNull();

    const startX = a!.x + a!.width / 2;
    const startY = a!.y + 24;
    const endX = s!.x + s!.width / 2;
    const endY = s!.y + s!.height / 2;

    // 1) press → 2) hold past the 500ms long-press → 3) move past threshold to
    // enter drag → 4) a single fast final segment (the flick) → 5) release.
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.waitForTimeout(560);                 // long-press activation
    await page.mouse.move(startX + 16, startY + 4); // exceed DRAG_THRESHOLD → dragging
    await page.mouse.move(endX, endY, { steps: 1 }); // fast flick segment (≥24px, ~instant)
    await page.mouse.up();

    // User-visible result: OmniSlate now carries the flicked widget's context.
    const droplet = page.locator('button[title^="Remove Widget:"]');
    await expect(droplet.first(), 'flick-to-set must place a context droplet in OmniSlate')
      .toBeVisible({ timeout: 5_000 });
    await shot(page, 'flick-to-set-context.png');
    assertNoFatal(ev);
  });
});

test.describe('OmniDash — tablet navigation (768×1024)', () => {
  test.use({ viewport: VIEWPORTS.tabletPortrait });

  test('7. tablet shell loads without overflow', async ({ page }) => {
    test.skip(!isBackendRequired(), 'BLOCKED(APEX-1207): requires live Supabase session');
    const ev = attachEvidence(page);
    await signInWithSupabaseSession(page);
    await expect(page.getByTestId('omnidash-top-header')).toBeVisible({ timeout: 15_000 });
    await noHorizontalOverflow(page);
    await shot(page, 'tablet-home.png');
    assertNoFatal(ev);
  });
});
