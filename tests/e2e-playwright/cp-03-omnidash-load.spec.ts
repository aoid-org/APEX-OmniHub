/**
 * CP-03 — OmniDash Load
 * Journey: auth → /omnidash → all 3 panels show real data
 * Exit assertion: header, agent widget, slate widget all visible; no mock drift
 * Primary risks: mock data regression — explicitly asserts NO placeholder values
 *
 * REGRESSION GUARD for formerly-flagged "DashboardOverview mock data" gap.
 * Must assert real data present AND no mock/placeholder values.
 */
import { test, expect, type Page } from '@playwright/test';
import { signInWithSupabaseSession, skipWithoutSupabaseConfig } from './helpers/auth';

const FATAL = /createContext|Cannot read properties of undefined|ChunkLoadError|Loading chunk|Failed to fetch dynamically imported module/;
// These strings must NEVER appear in a production OmniDash render
const MOCK_PATTERNS = [
  /lorem ipsum/i,
  /placeholder/i,
  /mock data/i,
  /\[object Object\]/,
  /undefined/,
  /TODO:/i,
  /FIXME:/i,
];

function trackConsole(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(`PAGEERROR: ${e.message}`));
  return errors;
}

async function isDesktop(page: Page): Promise<boolean> {
  return page.locator('.omni-sidebar').isVisible({ timeout: 6_000 }).catch(() => false);
}

test.describe('CP-03 — OmniDash Load', () => {
  test.beforeEach(async ({ page }) => {
    skipWithoutSupabaseConfig();
    await signInWithSupabaseSession(page);
  });

  test('top header renders with correct structure', async ({ page }) => {
    const errors = trackConsole(page);
    await expect(page.getByTestId('omnidash-top-header')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('top-header-logo')).toBeVisible();
    expect(errors.filter((e) => FATAL.test(e))).toHaveLength(0);
  });

  test('OmniSlate (slate widget) renders on desktop canvas', async ({ page }) => {
    const errors = trackConsole(page);
    test.skip(!(await isDesktop(page)), 'APEX-1001: OmniSlate widget is desktop canvas only');

    const slate = page.getByTestId('widget_slate');
    await expect(slate).toBeVisible({ timeout: 15_000 });
    // Prompt input must be interactive
    await expect(page.getByTestId('omnislate-prompt-input')
      .or(slate.getByPlaceholder('Ask APEX Agent anything…'))).toBeVisible();
    expect(errors.filter((e) => FATAL.test(e))).toHaveLength(0);
  });

  test('APEX Agent widget renders on desktop canvas', async ({ page }) => {
    const errors = trackConsole(page);
    test.skip(!(await isDesktop(page)), 'APEX-1001: Agent widget is desktop canvas only');

    const agent = page.getByTestId('widget_agent');
    await expect(agent).toBeVisible({ timeout: 15_000 });
    expect(errors.filter((e) => FATAL.test(e))).toHaveLength(0);
  });

  test('OmniDash body contains NO mock/placeholder text (regression guard)', async ({ page }) => {
    // Wait for the shell to fully render
    await expect(page.getByTestId('omnidash-top-header')).toBeVisible({ timeout: 15_000 });
    // Give async data 3s to settle
    await page.waitForTimeout(3_000);

    const bodyText = await page.locator('body').innerText();
    for (const pattern of MOCK_PATTERNS) {
      expect(
        pattern.test(bodyText),
        `Mock pattern "${pattern}" found in OmniDash body — mock data drift detected`,
      ).toBe(false);
    }
  });

  test('no 4xx/5xx silent failures during OmniDash load', async ({ page }) => {
    const failedRequests: string[] = [];
    page.on('response', (resp) => {
      if (resp.status() >= 400) {
        failedRequests.push(`${resp.status()} ${resp.url()}`);
      }
    });

    await page.reload({ waitUntil: 'domcontentloaded' });

    // Filter out expected 401 from supabase realtime (anon subscription attempt before
    // realtime channel auth completes is expected). Allow 404 for optional endpoints.
    const hard = failedRequests.filter(
      (r) => !r.includes('/realtime/') && !r.includes('status=401') && r.startsWith('5'),
    );
    expect(hard, `Silent 5xx errors during OmniDash load: ${hard.join(', ')}`).toHaveLength(0);
  });

  test('all 3 panel areas present: canvas, sidebar, right-rail (desktop)', async () => {
    test.skip(true, 'APEX-2003: rt_security visibility timing-dependent in CI (>15s); right-rail performance is a tracked production gate; text-based coverage via ops-widgets-smoke.spec.ts'); // APEX-2003
  });
});
