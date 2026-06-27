/**
 * APEX-OmniHub — User-Shoes End-to-End Validation
 *
 * Walks the OmniHub product surface the way a first-time operator would:
 *  - confirms the protected dashboard is blocked while unauthenticated;
 *  - signs in and confirms OmniDash loads (sidebar + spatial canvas);
 *  - opens every sidebar module and asserts modal IDENTITY + ISOLATION
 *    (never a bare `[role=dialog]` visibility check);
 *  - holds the product-truth ownership boundary: OmniBoard owns app
 *    integration, Links owns URL/context only and never routes to OmniBoard;
 *  - confirms unsupported actions are honestly gated (no generic backend 500);
 *  - confirms Settings exposes meaningful named controls;
 *  - confirms the OmniMedia launcher opens the player and its controls respond.
 *
 * DOCTRINE (.understand-anything/E2E_CANONICAL_BEHAVIOR.md):
 *  - `test.fail()` is banned; skips carry an APEX blocker on the SAME line.
 *  - Modals are asserted via `assertModalIdentityAndIsolation`.
 *  - Navigation waits on `domcontentloaded` + explicit visual assertions, never
 *    `networkidle` (Supabase long-polling never lets the network idle in CI).
 *  - Default run is READ-ONLY: no prompts submitted, no files/billing/settings
 *    mutated, no supported backend action fired against a real account.
 *
 * Backend-dependent coverage self-skips under render-smoke `npm run test:e2e`
 * and runs at full strictness under `npm run test:e2e:backend`.
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

import { test, expect, type Page, type Locator } from '@playwright/test';
import { signInWithSupabaseSession, skipWithoutSupabaseConfig } from './helpers/auth';
import { assertModalIdentityAndIsolation } from './helpers/modal';

// ── Fatal runtime signatures — a green test over any of these is a false pass ──
const FATAL =
  /createContext|Cannot read properties of undefined|ChunkLoadError|Loading chunk|Failed to fetch dynamically imported module|Minified React error/;

// Generic broken-state copy that must NOT surface from an honestly-gated action.
const GENERIC_FAILURE = /Failed to fetch|Internal Server Error|\b500\b|undefined is not|NetworkError/i;

/**
 * Strip every credential-bearing component from a runtime URL before it lands in
 * evidence. Removes userinfo, query string, and hash (these can carry tokens,
 * `access_token`, `code`, redirect targets, etc.). Origin + path only.
 */
function sanitizeUrl(raw: string): string {
  try {
    const u = new URL(raw);
    return `${u.protocol}//${u.host}${u.pathname}`;
  } catch {
    return raw.split('?')[0].split('#')[0];
  }
}

function trackConsole(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(`PAGEERROR: ${e.message}`));
  return errors;
}

function fatalErrors(errors: readonly string[]): string[] {
  return errors.filter((e) => FATAL.test(e));
}

/** The desktop sidebar only mounts on the desktop layout branch (isDesktop guard). */
async function isDesktopLayout(page: Page): Promise<boolean> {
  return page.locator('.omni-sidebar').isVisible({ timeout: 8000 }).catch(() => false);
}

/**
 * Open a sidebar module the way a user clicks it. Per APEX patch rule: scope the
 * click to `.omni-sidebar` first, fall back to page level only if the scoped
 * button is genuinely absent.
 */
async function openSidebarModule(page: Page, label: string): Promise<void> {
  const scoped = page.locator('.omni-sidebar').getByRole('button', { name: label, exact: true });
  if (await scoped.count() > 0) {
    await scoped.first().click();
    return;
  }
  await page.getByRole('button', { name: label, exact: true }).click();
}

/**
 * Open a sidebar module, wait for its live data to finish loading, then assert
 * modal identity + isolation. Module panels fetch live state from Supabase and
 * render a "Loading module…" spinner first; a real operator waits for the panel
 * before reading it, so we let the spinner clear before the identity check (the
 * shared helper's internal timeout is too tight for a live backend round-trip).
 */
async function openModuleModal(
  page: Page,
  label: string,
  discriminator: RegExp,
): Promise<Locator> {
  await openSidebarModule(page, label);
  const dialog = page.getByTestId('omni-dialog').or(page.getByRole('dialog')).first();
  await expect(dialog).toBeVisible({ timeout: 10_000 });
  await expect(dialog.getByText(/Loading module/i).first()).toBeHidden({ timeout: 20_000 });
  return assertModalIdentityAndIsolation(page, discriminator);
}

/** Close the open spatial dialog via its accessible Close control and confirm teardown. */
async function closeDialog(page: Page): Promise<void> {
  const dialog = page.getByTestId('omni-dialog').or(page.getByRole('dialog')).first();
  await dialog.getByRole('button', { name: 'Close', exact: true }).first().click();
  await expect(dialog).toBeHidden({ timeout: 8000 });
}

async function attachScreenshot(name: string, target: Page | Locator): Promise<void> {
  const body = await target.screenshot();
  await test.info().attach(name, { body, contentType: 'image/png' });
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Authorization boundary — runs in EVERY mode (no backend required).
//    A protected route that renders the dashboard to an anonymous visitor is a
//    NO-GO. We prove the OmniDash shell never mounts without a session.
// ─────────────────────────────────────────────────────────────────────────────
test.describe('APEX User-Shoes — authorization boundary', () => {
  test('protected /omnidash is blocked when unauthenticated', async ({ page }) => {
    const errors = trackConsole(page);

    await page.goto('/omnidash', { waitUntil: 'domcontentloaded' });
    // App shell must render (catches blank-page / chunk failures) ...
    await expect(page.locator('[data-testid="app-shell"]')).toBeVisible({ timeout: 15_000 });
    // ... but the AUTHENTICATED surface (sidebar + dashboard canvas) must NOT.
    await expect(page.locator('.omni-sidebar')).toBeHidden({ timeout: 10_000 });
    await expect(page.locator('.omni-canvas-container')).toBeHidden();

    // ProtectedRoute either redirects to /auth (config present) or shows the
    // service-config screen (config absent). Both are valid "blocked" states;
    // neither is the dashboard. Record the sanitized landing for evidence.
    test.info().annotations.push({
      type: 'evidence',
      description: `unauthenticated landing: ${sanitizeUrl(page.url())}`,
    });

    expect(fatalErrors(errors), errors.join('\n')).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Authenticated desktop sweep — the operator's real session.
//    Self-skips in render-smoke mode (BLOCKED APEX-1207); full strictness under
//    test:e2e:backend.
// ─────────────────────────────────────────────────────────────────────────────
test.describe('APEX User-Shoes — authenticated OmniDash (desktop)', () => {
  test.beforeEach(async ({ page }) => {
    skipWithoutSupabaseConfig();
    await signInWithSupabaseSession(page); // lands on /omnidash with a real session
  });

  test('OmniDash loads with sidebar and spatial canvas', async ({ page }) => {
    const errors = trackConsole(page);
    test.skip(!(await isDesktopLayout(page)), 'APEX-1001: Sidebar is desktop-only; mobile uses bottom nav.');

    await expect(page).toHaveURL(/\/omnidash/);
    await expect(page.locator('.omni-sidebar')).toBeVisible();
    await expect(page.locator('.omni-canvas-container')).toBeVisible({ timeout: 10_000 });
    expect(fatalErrors(errors), errors.join('\n')).toHaveLength(0);
  });

  // Every sidebar module must open ITS OWN modal — proven by a module-specific
  // discriminator, not generic dialog visibility. OmniBoard's discriminator is
  // its app-integration wizard; all others are their canonical headline copy.
  const MODULE_MATRIX: ReadonlyArray<{ label: string; discriminator: RegExp }> = [
    { label: 'OmniBoard',   discriminator: /App Integration|app or provider/i },
    { label: 'PhysiOmni',   discriminator: /Physical operations and device telemetry\./i },
    { label: 'Audits',      discriminator: /Governance, compliance, and security audit trail\./i },
    { label: 'Links',       discriminator: /URLs and reference sources collected for OmniSlate/i },
    { label: 'Automations', discriminator: /Workflow automation rules and triggers\./i },
    { label: 'Workflows',   discriminator: /Visual workflow definitions and process studio\./i },
    { label: 'Files',       discriminator: /Document management and file operations\./i },
    { label: 'Billing',     discriminator: /Subscription management and usage analytics\./i },
    { label: 'Settings',    discriminator: /Platform configuration and operational preferences\./i },
  ];

  test('every sidebar module opens its correct modal (identity + isolation)', async ({ page }) => {
    const errors = trackConsole(page);
    test.skip(!(await isDesktopLayout(page)), 'APEX-1001: Sidebar is desktop-only; mobile uses bottom nav.');

    for (const mod of MODULE_MATRIX) {
      await openModuleModal(page, mod.label, mod.discriminator);
      // Opening a module is an overlay — the route must never drift.
      await expect(page, `route drift on ${mod.label}`).toHaveURL(/\/omnidash/);
      await closeDialog(page);
    }

    expect(fatalErrors(errors), errors.join('\n')).toHaveLength(0);
  });

  test('OmniBoard owns app integration (sidebar opens the connect agent surface)', async ({ page }) => {
    test.skip(!(await isDesktopLayout(page)), 'APEX-1001: Sidebar is desktop-only; mobile uses bottom nav.');

    const dialog = await openModuleModal(page, 'OmniBoard', /App Integration|app or provider/i);

    // It is the integration agent surface — it asks what to connect and offers a
    // connect action. It must NOT be reduced to a silent canvas-focus affordance.
    await expect(dialog.getByText(/what app or provider|connect/i).first()).toBeVisible();
    await expect(dialog.getByRole('button', { name: /connect|authoriz|retry/i }).first()).toBeVisible();

    await attachScreenshot('omniboard-app-integration.png', dialog);
    await closeDialog(page);
  });

  test('Links owns URL/context only and never routes to OmniBoard', async ({ page }) => {
    const errors = trackConsole(page);
    test.skip(!(await isDesktopLayout(page)), 'APEX-1001: Sidebar is desktop-only; mobile uses bottom nav.');

    const dialog = await openModuleModal(
      page,
      'Links',
      /URLs and reference sources collected for OmniSlate/i,
    );

    // The load-bearing product-truth invariant: Links is its OWN surface. The
    // OmniBoard app-integration wizard identity must be ABSENT, and none of the
    // forbidden app-connection labels may appear. Holds regardless of backend
    // availability, so it is asserted unconditionally.
    await expect(dialog.getByText(/OmniBoard — App Integration/i)).toHaveCount(0);
    await expect(dialog.getByText(/Connect App|Add Connection|Connect a Link/i)).toHaveCount(0);
    // The empty/unavailable state must not degrade into a generic crash or 500.
    await expect(dialog.getByText(GENERIC_FAILURE)).toHaveCount(0);

    await attachScreenshot('links-url-context.png', dialog);
    await closeDialog(page);
    expect(fatalErrors(errors), errors.join('\n')).toHaveLength(0);
  });

  // NO-GO finding, tracked: in the live authenticated state the Links module
  // resolves to UNAVAILABLE and strips its local-only actions, so the operator
  // sees a bare "UNAVAILABLE" badge with no Add Link / Send to OmniSlate form and
  // no prerequisite copy (Settings, by contrast, explains its paid-tier gating).
  // Same Links add-link gap the repo already tracks under APEX-2011.
  test.skip('Links exposes the Add Link staging affordance', () => { /* NO-GO(APEX-2011): live Links resolves UNAVAILABLE and drops local add-link/send-to-omnislate actions, leaving no add-link form */ }); // APEX-2011

  test('Settings exposes meaningful controls and gates paid-only ones honestly', async ({ page }) => {
    const errors = trackConsole(page);
    test.skip(!(await isDesktopLayout(page)), 'APEX-1001: Sidebar is desktop-only; mobile uses bottom nav.');

    const dialog = await openModuleModal(
      page,
      'Settings',
      /Platform configuration and operational preferences\./i,
    );

    // Named sections + controls, not blank rows. READ-ONLY: we assert presence
    // and never persist a backend toggle.
    await expect(dialog.getByText('Appearance', { exact: true })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Light', exact: true })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Dark', exact: true })).toBeVisible();
    await expect(dialog.getByText('Platform Settings', { exact: true })).toBeVisible();
    // Named platform settings render (proves the rows aren't blank shells).
    await expect(dialog.getByText('Demo Mode', { exact: true })).toBeVisible();
    await expect(dialog.getByText('Guardian Mode', { exact: true })).toBeVisible();

    // Honest gating, not a broken backend: a tier-gated control is disabled WITH
    // actionable copy — never a raw 500 / "Failed to fetch". (Enabled when the
    // signed-in account already has the tier, so the copy assertion is guarded.)
    const paidToggle = dialog.getByRole('switch', { name: 'Toggle Demo Mode', exact: true });
    await expect(paidToggle).toBeVisible();
    if (await paidToggle.isDisabled()) {
      await expect(
        dialog.getByText(/sign in with a paid account|requires admin or paid/i).first(),
      ).toBeVisible();
    }
    await expect(dialog.getByText(GENERIC_FAILURE)).toHaveCount(0);

    await closeDialog(page);
    expect(fatalErrors(errors), errors.join('\n')).toHaveLength(0);
  });

  test('OmniMedia launcher opens the player and its controls respond', async ({ page }) => {
    const errors = trackConsole(page);
    test.skip(!(await isDesktopLayout(page)), 'APEX-1001: OmniMedia launcher lives in the desktop right rail.');

    // Launch a demo clip from the right-rail OmniMedia widget.
    const rail = page.locator('.omni-right-panel');
    await expect(rail.getByText('OmniMedia', { exact: true })).toBeVisible({ timeout: 10_000 });
    await rail.getByRole('button', { name: /Big Buck Bunny/i }).click();

    // The persistent media dock mounts with the selected clip loaded into its
    // player. Demo clips are YouTube embeds, so the iframe owns play/pause; the
    // dock exposes minimize + close transport controls around it (by design,
    // GlobalMediaDock omits its own play/pause button for `type: 'embed'`).
    const dock = page.locator('.omni-media-dock');
    await expect(dock).toBeVisible({ timeout: 8000 });
    await expect(dock.locator('iframe[title="Big Buck Bunny"]')).toBeVisible({ timeout: 8000 });
    await expect(dock.getByRole('button', { name: 'Minimize media player', exact: true })).toBeVisible();
    await attachScreenshot('omnimedia-dock.png', dock);

    // Minimize collapses to the re-dock chip, then expand restores the full dock —
    // proving the transport controls actually drive dock state (local store).
    await dock.getByRole('button', { name: 'Minimize media player', exact: true }).click();
    await expect(dock.getByRole('button', { name: 'Expand media player', exact: true })).toBeVisible({ timeout: 5000 });
    await dock.getByRole('button', { name: 'Expand media player', exact: true }).click();
    await expect(dock.locator('iframe[title="Big Buck Bunny"]')).toBeVisible({ timeout: 5000 });

    // Closing the player tears the dock down cleanly.
    await dock.getByRole('button', { name: 'Close media player', exact: true }).click();
    await expect(dock).toBeHidden({ timeout: 8000 });

    expect(fatalErrors(errors), errors.join('\n')).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Mobile matrix — formally deferred. Not a product defect; a coverage gap
//    owned by the mobile-specific project. Blocker reference is on the SAME line
//    as `.skip` per the R2 Integrity Sentinel.
// ─────────────────────────────────────────────────────────────────────────────
test.describe('APEX User-Shoes — mobile bottom-nav sweep', () => {
  test.skip('mobile operator sweep (bottom nav + drawer)', () => { /* BLOCKED(APEX-1001): mobile user-shoes matrix deferred to the mobile-chrome/mobile-safari projects */ }); // BLOCKED(APEX-1001)
});
