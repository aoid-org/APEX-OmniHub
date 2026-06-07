import { test, expect, type Page } from '@playwright/test';
import { signInWithSupabaseSession, skipWithoutSupabaseConfig } from './helpers/auth';

/**
 * OmniDash Authenticated Interaction Coverage
 *
 * Deeper post-auth interaction tests beyond render/wiring smoke. Every interaction
 * here is verified CLIENT-SIDE / READ-ONLY against the running app — it never clicks
 * module *action* buttons (those invoke `trigger-workflow` Supabase Edge Functions →
 * Temporal) and never submits the OmniSlate prompt (POSTs to /api/mcp/invoke). Those
 * mutating paths are intentionally excluded so the suite is safe against a real account.
 *
 * Selectors verified against apps/omnihub-site/dashboard/OmniDashShell.tsx and components/.
 * Desktop-only surfaces (sidebar, right-rail) run under the chromium project; the suite
 * is viewport-aware where layout differs.
 */

const FATAL = /createContext|Cannot read properties of undefined|ChunkLoadError|Loading chunk|Failed to fetch dynamically imported module/;

function trackConsole(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(`PAGEERROR: ${e.message}`));
  return errors;
}

async function isDesktopLayout(page: Page): Promise<boolean> {
  // The desktop sidebar only renders on the desktop layout branch (isDesktop guard).
  return page.locator('.omni-sidebar').isVisible({ timeout: 8000 }).catch(() => false);
}

test.describe('OmniDash Authenticated Interactions', () => {
  test.beforeEach(async ({ page }) => {
    skipWithoutSupabaseConfig();
    await signInWithSupabaseSession(page); // lands on /omnidash with a real session
  });

  test('sidebar module opens its dialog and closes without route drift (desktop)', async ({ page }) => {
    const errors = trackConsole(page);
    test.skip(!(await isDesktopLayout(page)), 'Sidebar is desktop-only; mobile uses bottom nav.');

    // Open the Audits module via its sidebar nav button (accessible name = label span).
    await page.getByRole('button', { name: 'Audits', exact: true }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 8000 });
    await expect(dialog.getByText('Governance, compliance, and security audit trail.')).toBeVisible();
    // Route must NOT change when opening a module modal.
    await expect(page).toHaveURL(/\/omnidash/);

    // Close (safe — only clears modal state; does not invoke any workflow).
    // Two "Close" controls exist (Radix X + footer button); the footer one is last.
    await dialog.getByRole('button', { name: 'Close' }).last().click();
    await expect(dialog).toBeHidden({ timeout: 8000 });
    await expect(page).toHaveURL(/\/omnidash/);

    expect(errors.filter((e) => FATAL.test(e))).toHaveLength(0);
  });

  test('multiple sidebar modules each open the correct dialog (desktop)', async ({ page }) => {
    trackConsole(page);
    test.skip(!(await isDesktopLayout(page)), 'Sidebar is desktop-only.');

    const cases: Array<{ nav: string; headline: string }> = [
      { nav: 'Automations', headline: 'Workflow automation rules and triggers.' },
      { nav: 'Workflows', headline: 'Visual workflow definitions and process studio.' },
      { nav: 'Files', headline: 'Document management and file operations.' },
      { nav: 'Settings', headline: 'Platform configuration and operational preferences.' },
    ];

    for (const c of cases) {
      await page.getByRole('button', { name: c.nav, exact: true }).click();
      const dialog = page.getByRole('dialog');
      await expect(dialog, `dialog for ${c.nav}`).toBeVisible({ timeout: 8000 });
      await expect(dialog.getByText(c.headline)).toBeVisible({ timeout: 8000 });
      await dialog.getByRole('button', { name: 'Close' }).last().click();
      await expect(dialog).toBeHidden({ timeout: 8000 });
    }
  });

  test('APEX Agent play/pause/reset toggle local run state (desktop)', async ({ page }) => {
    const errors = trackConsole(page);
    test.skip(!(await isDesktopLayout(page)), 'APEX Agent widget controls are on the desktop canvas.');

    const widget = page.getByTestId('widget_agent');
    await expect(widget).toBeVisible({ timeout: 8000 });

    // Starts paused → Start button present.
    const startBtn = widget.getByTitle('Start');
    await expect(startBtn).toBeVisible();
    await startBtn.click();
    // After start, the control flips to Pause.
    await expect(widget.getByTitle('Pause')).toBeVisible({ timeout: 5000 });

    // Reset returns to a non-running state (Start visible again).
    await widget.getByTitle('Reset').click();
    await expect(widget.getByTitle('Start')).toBeVisible({ timeout: 5000 });

    expect(errors.filter((e) => FATAL.test(e))).toHaveLength(0);
  });

  test('OmniSlate CleanSlate is interactive without sending a prompt (desktop)', async ({ page }) => {
    trackConsole(page);
    test.skip(!(await isDesktopLayout(page)), 'OmniSlate widget is on the desktop canvas.');

    const widget = page.getByTestId('widget_slate');
    await expect(widget).toBeVisible({ timeout: 8000 });

    // Type into the prompt but DO NOT send (send POSTs to /api/mcp/invoke).
    const input = widget.getByPlaceholder('Ask APEX Agent anything…');
    await expect(input).toBeVisible();
    await input.fill('certification typing probe (not sent)');
    await expect(input).toHaveValue('certification typing probe (not sent)');

    // CleanSlate is pure local state (clears messages); safe to click.
    await widget.getByRole('button', { name: 'CleanSlate' }).click();
    // Widget remains mounted and on-route.
    await expect(widget).toBeVisible();
    await expect(page).toHaveURL(/\/omnidash/);
  });

  test('theme toggle persists isDark to localStorage (desktop)', async ({ page }) => {
    trackConsole(page);
    test.skip(!(await isDesktopLayout(page)), 'Theme toggle lives in the desktop header.');

    const readDark = () => page.evaluate(() => {
      try { return JSON.parse(globalThis.localStorage.getItem('omnidash:layout:v1') || '{}').isDark; }
      catch { return undefined; }
    });

    const before = await readDark();
    // Header theme button has no testid/aria. In dark mode it shows a sun icon
    // (circle[r="5"]); in light mode a moon path. Target by the icon to avoid the
    // adjacent notifications/Connect-AI buttons.
    const themeBtn = page.locator('.omni-header-actions button')
      .filter({ has: page.locator('circle[r="5"], path[d*="M21 12.79"]') })
      .first();
    await expect(themeBtn).toBeVisible({ timeout: 8000 });
    await themeBtn.click();
    await page.waitForTimeout(500);
    const after = await readDark();

    expect(after, 'isDark should flip and persist').not.toBe(before);
  });

  test('Ops Controls toggles flip and persist (desktop right-rail)', async ({ page }) => {
    trackConsole(page);
    test.skip(!(await isDesktopLayout(page)), 'Ops controls are in the desktop right-rail.');

    const ops = page.locator('.sentinel-section').filter({ hasText: 'Ops Controls' });
    await expect(ops).toBeVisible({ timeout: 8000 });
    await expect(ops.getByText('Ops Controls')).toBeVisible();

    const readAutoPilot = () => page.evaluate(() => {
      try { return JSON.parse(globalThis.localStorage.getItem('omnidash:layout:v1') || '{}').ops?.autoPilot; }
      catch { return undefined; }
    });

    const before = await readAutoPilot();
    const autoPilotToggle = page.locator('div').filter({ hasText: /^Auto-Pilot/ }).locator('button').first();
    await expect(autoPilotToggle).toBeVisible({ timeout: 8000 });
    await autoPilotToggle.click();
    await page.waitForTimeout(400);
    const after = await readAutoPilot();

    expect(after, 'Auto-Pilot ops flag should flip and persist').not.toBe(before);
  });
});
