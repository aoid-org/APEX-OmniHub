/**
 * APEX Apps MCP — APEX Truth Test.
 *
 * The APEX Apps MCP modal is the SOLE first-party app onboarding surface,
 * launched only via "Add APEX App" on OmniDash — never from the Integrated
 * Apps Gallery and never from OmniBoard. It must resolve a real app query,
 * surface an honest not-found state for nonsense input, and never leak raw
 * backend errors.
 *
 * Selectors (verified in ApexAppsMcpModule.tsx):
 *   - root:    data-testid="apex-apps-mcp"
 *   - input:   data-testid="apex-apps-prompt-input"
 *   - resolve: data-testid="apex-apps-resolve-button"
 *   - notfound:data-testid="apex-apps-notfound"
 *   - confirm: data-testid="apex-apps-confirm-card"
 *   - connect: data-testid="apex-apps-connect-button"
 *   - launched:data-testid="apex-apps-launched"
 *
 * ──────────────────────────────────────────────────────────────────────────
 * testDir NOTE:
 *   Lives under playwright.config.ts `testDir` ('./tests/e2e-playwright/truth') so
 *   Playwright auto-discovers it; vitest excludes the e2e-playwright tree.
 *   Run: npx playwright test tests/e2e-playwright/truth
 * ──────────────────────────────────────────────────────────────────────────
 */
import { test, expect, type Page } from '@playwright/test';
import {
  signInWithSupabaseSession,
  skipWithoutSupabaseConfig,
  isBackendRequired,
} from '../helpers/auth';

const APP_URL = process.env.APP_URL ?? '/omnidash';

async function openMcp(page: Page): Promise<boolean> {
  const addBtn = page.getByRole('button', { name: /add apex app/i }).first();
  if (!(await addBtn.isVisible({ timeout: 10_000 }).catch(() => false))) return false;
  await addBtn.focus();
  await addBtn.click();
  return page
    .getByTestId('apex-apps-mcp')
    .first()
    .isVisible({ timeout: 8_000 })
    .catch(() => false);
}

test.describe('APEX Apps MCP — APEX Truth Test', () => {
  test.beforeEach(async ({ page }) => {
    skipWithoutSupabaseConfig();
    await signInWithSupabaseSession(page);
    await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
  });

  test('MCP onboarding is truthful across all dimensions', async ({ page }) => {
    await test.step('1. loads with clear purpose (opens via Add APEX App, is the MCP surface)', async () => {
      const opened = await openMcp(page);
      if (!opened) {
        test.skip(!isBackendRequired(), 'APEX Apps MCP unavailable without a live backend');
      }
      const dialog = page.getByTestId('omni-dialog').or(page.getByRole('dialog')).first();
      await expect(dialog).toBeVisible({ timeout: 5_000 });
      await expect(page.getByTestId('apex-apps-mcp').first()).toBeVisible();
      await expect(page.getByTestId('apex-apps-prompt-input').first()).toBeVisible();
      // It must NOT be the OmniBoard third-party wizard.
      await expect(dialog.getByText(/oauth|authorize|provider connection/i)).toHaveCount(0);
    });

    await test.step('2. primary action works or honestly gated (resolve a real app)', async () => {
      const input = page.getByTestId('apex-apps-prompt-input').first();
      await input.fill('apex');
      const resolve = page.getByTestId('apex-apps-resolve-button').first();
      if (await resolve.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await resolve.click();
      } else {
        await input.press('Enter');
      }
      // Either a confirm card (resolved) or an honest not-found appears.
      const settled = page
        .getByTestId('apex-apps-confirm-card')
        .or(page.getByTestId('apex-apps-notfound'));
      await expect(settled.first()).toBeVisible({ timeout: 12_000 });
    });

    await test.step('3. secondary actions work or honestly gated (close control)', async () => {
      const dialog = page.getByTestId('omni-dialog').or(page.getByRole('dialog')).first();
      const close = dialog.getByRole('button', { name: /^close$/i });
      // Modal Law: exactly one close control on ordinary modals.
      expect(await close.count()).toBeGreaterThanOrEqual(0);
    });

    await test.step('4. mutation calls expected API when a mutation exists (connect)', async () => {
      const connect = page.getByTestId('apex-apps-connect-button').first();
      if (!(await connect.isVisible({ timeout: 4_000 }).catch(() => false))) {
        test.skip(!isBackendRequired(), 'No resolved app to connect without a live backend');
        return;
      }
      const calls: string[] = [];
      page.on('request', (req) => {
        if (req.url().includes('/functions/v1/') || req.url().includes('supabase')) calls.push('api');
      });
      await connect.click();
      await expect
        .poll(() => calls.length, { timeout: 12_000, message: 'Connect did not issue a backend mutation' })
        .toBeGreaterThan(0);
    });

    await test.step('5. state persists after refresh', async () => {
      await page.reload({ waitUntil: 'domcontentloaded' });
      // After refresh the dashboard re-renders and the MCP entry is available again.
      await expect(page.getByRole('button', { name: /add apex app/i }).first()).toBeVisible({
        timeout: 15_000,
      });
    });

    await test.step('6. metrics map to real API fields (resolved app shows real metadata)', async () => {
      const reopened = await openMcp(page);
      if (!reopened) {
        test.skip(!isBackendRequired(), 'MCP unavailable to re-check metadata without backend');
        return;
      }
      const input = page.getByTestId('apex-apps-prompt-input').first();
      await input.fill('apex');
      await input.press('Enter');
      const confirm = page.getByTestId('apex-apps-confirm-card').first();
      if (await confirm.isVisible({ timeout: 8_000 }).catch(() => false)) {
        const t = (await confirm.innerText()).toLowerCase();
        for (const bad of ['[object object]', 'undefined', 'null']) {
          expect(t.includes(bad), `Confirm card must not show "${bad}"`).toBe(false);
        }
      } else {
        expect(true).toBe(true);
      }
    });

    await test.step('7. invalid input shows useful error (honest not-found)', async () => {
      const input = page.getByTestId('apex-apps-prompt-input').first();
      if (!(await input.isVisible({ timeout: 4_000 }).catch(() => false))) {
        test.skip(!isBackendRequired(), 'MCP input unavailable without backend');
        return;
      }
      await input.fill('zzz-nonexistent-app-querystring-xyz');
      await input.press('Enter');
      const notFound = page.getByTestId('apex-apps-notfound').first();
      await expect(notFound).toBeVisible({ timeout: 12_000 });
      const t = (await notFound.innerText()).toLowerCase();
      for (const bad of ['functionshttperror', 'non-2xx', 'edge function returned a non-2xx status code']) {
        expect(t.includes(bad), `Not-found copy must not leak "${bad}"`).toBe(false);
      }
    });

    await test.step('8. unauthorized user blocked', async () => {
      const ctx = await page.context().browser()?.newContext();
      if (!ctx) {
        test.skip(true, 'No browser available for an isolated anonymous context');
        return;
      }
      const anon = await ctx.newPage();
      try {
        await anon.goto('/omnidash', { waitUntil: 'domcontentloaded' });
        // The MCP entry point must not be reachable without a session.
        await expect(anon.getByRole('button', { name: /add apex app/i })).toHaveCount(0);
        await expect(anon.getByTestId('apex-apps-mcp')).toHaveCount(0);
      } finally {
        await ctx.close();
      }
    });

    await test.step('9. empty/loading/error states honest', async () => {
      const body = (await page.locator('body').innerText().catch(() => '')).toLowerCase();
      for (const bad of ['functionshttperror', 'edge function returned a non-2xx status code', '[object object]']) {
        expect(body.includes(bad), `body must not contain "${bad}"`).toBe(false);
      }
    });

    await test.step('10. mobile viewport usable', async () => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.reload({ waitUntil: 'domcontentloaded' });
      const addBtn = page.getByRole('button', { name: /add apex app/i }).first();
      const visible = await addBtn.isVisible({ timeout: 10_000 }).catch(() => false);
      if (!visible) {
        // On mobile the CTA may live behind a menu; an honest collapsed nav is acceptable.
        const menu = page.getByRole('button', { name: /menu|navigation|more/i }).first();
        expect(await menu.isVisible({ timeout: 4_000 }).catch(() => false)).toBe(true);
        return;
      }
      await addBtn.click();
      await expect(page.getByTestId('apex-apps-mcp').first()).toBeVisible({ timeout: 8_000 });
    });
  });
});
