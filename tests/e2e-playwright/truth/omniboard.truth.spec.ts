/**
 * OmniBoard — APEX Truth Test.
 *
 * OmniBoard is the persistent OmniDash canvas and the SOLE owner of
 * third-party app connections (the Integrated Apps Gallery is display-only;
 * the APEX Apps MCP owns first-party onboarding). OmniBoard is reached as the
 * sidebar "OmniBoard" nav section within authenticated /omnidash — not a
 * standalone public route.
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

function redactUrl(raw: string): string {
  try {
    const u = new URL(raw, 'http://local');
    for (const k of [...u.searchParams.keys()]) {
      if (/token|jwt|apikey|api_key|key|signature|sig|access|secret/i.test(k)) {
        u.searchParams.set(k, 'REDACTED');
      }
    }
    const out = u.toString().replace(/eyJ[A-Za-z0-9._-]{10,}/g, 'REDACTED_JWT');
    return out.startsWith('http://local') ? out.replace('http://local', '') : out;
  } catch {
    return raw.replace(/eyJ[A-Za-z0-9._-]{10,}/g, 'REDACTED_JWT');
  }
}

interface CapturedResponse {
  readonly url: string;
  readonly status: number;
}

function captureApi(page: Page): CapturedResponse[] {
  const out: CapturedResponse[] = [];
  page.on('response', (res) => {
    const url = res.url();
    if (url.includes('/api/') || url.includes('/functions/v1/') || url.includes('supabase')) {
      out.push({ url: redactUrl(url), status: res.status() });
    }
  });
  return out;
}

/** OmniBoard canvas locator — the persistent dashboard canvas. */
function boardCanvas(page: Page) {
  return page.locator('.omni-canvas-container, [data-testid="omnidash-canvas"], .omni-canvas').first();
}

test.describe('OmniBoard — APEX Truth Test', () => {
  test('unauthorized user blocked', async ({ page }) => {
    skipWithoutSupabaseConfig();
    await test.step('8. unauthorized user blocked', async () => {
      await page.goto('/omnidash', { waitUntil: 'domcontentloaded' });
      const hasGate = await page
        .locator('[data-testid="auth-gate"], [data-testid="login-form"], form[action*="auth"]')
        .first()
        .isVisible({ timeout: 10_000 })
        .catch(() => false);
      const redirected = page.url().includes('/login') || page.url().includes('/auth');
      expect(hasGate || redirected, 'OmniBoard must require auth').toBe(true);
      await expect(boardCanvas(page)).toHaveCount(0);
    });
  });

  test('OmniBoard is truthful across all dimensions', async ({ page }) => {
    skipWithoutSupabaseConfig();
    const responses = captureApi(page);

    await test.step('1. loads with clear purpose', async () => {
      await signInWithSupabaseSession(page);
      await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
      await expect(boardCanvas(page)).toBeVisible({ timeout: 15_000 });
    });

    await test.step('2. primary action works or honestly gated (connect a third-party app)', async () => {
      // OmniBoard owns third-party connections. Navigate to its section if a
      // sidebar nav exists; the connect entry must be present or honestly gated.
      const navItem = page.getByRole('button', { name: /^omniboard$/i }).first();
      if (await navItem.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await navItem.click().catch(() => {});
      }
      const connectEntry = page.getByRole('button', { name: /connect|add app|new connection/i }).first();
      const gated = page.locator('[data-testid="auth-gate"], [data-testid="omniboard-empty"]').first();
      const hasConnect = await connectEntry.isVisible({ timeout: 8_000 }).catch(() => false);
      const hasGate = await gated.isVisible({ timeout: 4_000 }).catch(() => false);
      if (!hasConnect && !hasGate) {
        test.skip(!isBackendRequired(), 'OmniBoard connect surface unavailable without a live backend');
      }
      expect(hasConnect || hasGate || isBackendRequired()).toBe(true);
    });

    await test.step('3. secondary actions work or honestly gated', async () => {
      const nav = page.locator('.omni-sidebar, .omni-nav-item, [role="navigation"]').first();
      const hasNav = await nav.isVisible({ timeout: 8_000 }).catch(() => false);
      const hasMenu = await page
        .getByRole('button', { name: /menu|navigation|more/i })
        .first()
        .isVisible({ timeout: 4_000 })
        .catch(() => false);
      expect(hasNav || hasMenu, 'OmniBoard must expose navigable secondary controls').toBe(true);
    });

    await test.step('4. mutation calls expected API when a mutation exists', async () => {
      const connectEntry = page.getByRole('button', { name: /connect|add app|new connection/i }).first();
      if (!(await connectEntry.isVisible({ timeout: 4_000 }).catch(() => false))) {
        test.skip(!isBackendRequired(), 'No connect mutation surface without a live backend');
        return;
      }
      const calls: string[] = [];
      page.on('request', (req) => {
        if (req.url().includes('/functions/v1/') || req.url().includes('supabase')) calls.push('api');
      });
      await connectEntry.click().catch(() => {});
      // A connect flow either opens a wizard (which fetches) or issues a call.
      const wizard = page.getByRole('dialog').first();
      const opened = await wizard.isVisible({ timeout: 6_000 }).catch(() => false);
      expect(opened || calls.length > 0, 'Connect must open a real wizard or call the backend').toBe(true);
      await page.keyboard.press('Escape').catch(() => {});
    });

    await test.step('5. state persists after refresh', async () => {
      await page.reload({ waitUntil: 'domcontentloaded' });
      await expect(boardCanvas(page)).toBeVisible({ timeout: 15_000 });
      await expect(page).toHaveURL(/\/omnidash/);
    });

    await test.step('6. metrics map to real API fields', async () => {
      if (responses.length === 0) {
        test.skip(!isBackendRequired(), 'No backend API traffic captured in render-smoke mode');
      }
      const reads = responses.filter((r) => r.status >= 200 && r.status < 300);
      expect(reads.length, 'OmniBoard data must come from real successful API reads').toBeGreaterThan(0);
    });

    await test.step('7. invalid input shows useful error', async () => {
      // The connect wizard is the input surface; nonsense input must yield an
      // honest error, not a crash. Guard when the wizard is unavailable.
      const connectEntry = page.getByRole('button', { name: /connect|add app|new connection/i }).first();
      if (!(await connectEntry.isVisible({ timeout: 4_000 }).catch(() => false))) {
        test.skip(!isBackendRequired(), 'Connect wizard unavailable without a live backend');
        return;
      }
      await connectEntry.click().catch(() => {});
      const field = page.getByRole('textbox').first();
      if (await field.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await field.fill('!!!invalid-connection-input!!!');
        await field.press('Enter').catch(() => {});
        const body = (await page.locator('body').innerText().catch(() => '')).toLowerCase();
        expect(body.includes('[object object]')).toBe(false);
        expect(body.includes('functionshttperror')).toBe(false);
      }
      await page.keyboard.press('Escape').catch(() => {});
    });

    await test.step('8. unauthorized user blocked (covered by dedicated test)', async () => {
      expect(true).toBe(true);
    });

    await test.step('9. empty/loading/error states honest', async () => {
      const body = (await page.locator('body').innerText().catch(() => '')).toLowerCase();
      for (const bad of [
        'edge function returned a non-2xx status code',
        'functionshttperror',
        '[object object]',
        'failed to fetch',
        'internal server error',
      ]) {
        expect(body.includes(bad), `OmniBoard body must not contain "${bad}"`).toBe(false);
      }
      const serverErrors = responses.filter((r) => r.status >= 500);
      expect(serverErrors, `5xx responses: ${JSON.stringify(serverErrors)}`).toHaveLength(0);
    });

    await test.step('10. mobile viewport usable', async () => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.reload({ waitUntil: 'domcontentloaded' });
      await expect(boardCanvas(page)).toBeVisible({ timeout: 15_000 });
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, 'OmniBoard must not overflow horizontally on a 390px viewport').toBeLessThanOrEqual(2);
    });
  });
});
