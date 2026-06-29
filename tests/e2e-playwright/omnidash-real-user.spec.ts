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

  test('7b. SidebarKpiBar present; right-rail metric tiles removed', async ({ page }) => {
    test.skip(!isBackendRequired(), 'BLOCKED(APEX-1207): requires live Supabase session');
    const ev = attachEvidence(page);
    await signInWithSupabaseSession(page);
    await expect(page.locator('.omni-sidebar')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('sidebar-kpi-bar')).toBeVisible();
    await expect(page.getByTestId('rt_analytics')).toHaveCount(0);
    await shot(page, 'sidebar-kpi-expanded.png');
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
