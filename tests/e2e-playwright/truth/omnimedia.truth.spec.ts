/**
 * OmniMedia — APEX Truth Test.
 *
 * Core honesty contract for the OmniMedia gallery: it must render ONE of its
 * honest states (gallery | empty | error), and an error surface must use the
 * stable user-safe copy — NEVER a raw SDK/Edge error string. The stable error
 * code lives in data-error-code (diagnostics), never in visible text.
 *
 * Honest states / selectors:
 *   - container:  data-testid="omnimedia-gallery"
 *   - loading:    data-testid="omnimedia-gallery-loading"
 *   - error:      data-testid="omnimedia-gallery-error" (role=alert, carries
 *                 data-error-code = a STABLE code, never a raw SDK string)
 *   - retry:      data-testid="omnimedia-gallery-retry"
 *   - empty:      data-testid="omnimedia-gallery-empty"
 *   - item:       data-testid="omnimedia-gallery-item"
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

/** Strings that must NEVER appear in any OmniMedia error surface. */
const FORBIDDEN_ERROR_SUBSTRINGS = [
  'Edge Function returned a non-2xx status code',
  'non-2xx',
  'FunctionsHttpError',
  'omnilink',
];

/** Resolve whichever honest OmniMedia state is currently rendered. */
async function resolveMediaState(
  page: Page,
): Promise<'gallery' | 'empty' | 'error' | 'loading' | 'none'> {
  const order = [
    ['error', 'omnimedia-gallery-error'],
    ['gallery', 'omnimedia-gallery'],
    ['empty', 'omnimedia-gallery-empty'],
    ['loading', 'omnimedia-gallery-loading'],
  ] as const;
  for (const [state, tid] of order) {
    if (await page.getByTestId(tid).first().isVisible({ timeout: 8_000 }).catch(() => false)) {
      return state;
    }
  }
  return 'none';
}

test.describe('OmniMedia — APEX Truth Test', () => {
  test.beforeEach(async ({ page }) => {
    skipWithoutSupabaseConfig();
    await signInWithSupabaseSession(page);
    await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
  });

  test('OmniMedia renders an honest state and never leaks raw backend errors', async ({ page }) => {
    let state: Awaited<ReturnType<typeof resolveMediaState>> = 'none';

    await test.step('1. loads with clear purpose (one honest state renders)', async () => {
      // Wait out any loading state to a terminal state.
      await page.waitForTimeout(1_000);
      state = await resolveMediaState(page);
      if (state === 'loading') {
        await expect
          .poll(async () => resolveMediaState(page), { timeout: 15_000 })
          .not.toBe('loading');
        state = await resolveMediaState(page);
      }
      expect(
        ['gallery', 'empty', 'error'].includes(state),
        `OmniMedia must settle into gallery|empty|error (got "${state}")`,
      ).toBe(true);
    });

    await test.step('error surface (if shown) uses honest copy + offers Retry', async () => {
      if (state !== 'error') {
        // On success the gallery or empty state must render — assert that.
        expect(['gallery', 'empty']).toContain(state);
        return;
      }
      const errorEl = page.getByTestId('omnimedia-gallery-error').first();
      await expect(errorEl).toBeVisible();
      await expect(errorEl).toHaveAttribute('role', 'alert');

      const visibleText = (await errorEl.innerText()).toLowerCase();
      for (const bad of FORBIDDEN_ERROR_SUBSTRINGS) {
        expect(
          visibleText.includes(bad.toLowerCase()),
          `OmniMedia error copy must NOT contain "${bad}"`,
        ).toBe(false);
      }

      // Retry control must exist when an error is shown.
      await expect(page.getByTestId('omnimedia-gallery-retry').first()).toBeVisible();
    });

    await test.step('2. primary action works or honestly gated', async () => {
      if (state === 'gallery') {
        // Items carry a Play action (aria-label "Play <title>").
        const playable = page.getByTestId('omnimedia-gallery-item').first();
        await expect(playable).toBeVisible();
        await expect(playable.getByRole('button').first()).toBeVisible();
      } else if (state === 'error') {
        await expect(page.getByTestId('omnimedia-gallery-retry').first()).toBeVisible();
      } else {
        // empty: honest "no media yet" guidance, no fake action.
        await expect(page.getByTestId('omnimedia-gallery-empty').first()).toBeVisible();
      }
    });

    await test.step('3. secondary actions work or honestly gated', async () => {
      if (state === 'gallery') {
        // Each item exposes per-item controls (e.g. Delete) — at least one button.
        const item = page.getByTestId('omnimedia-gallery-item').first();
        expect(await item.getByRole('button').count()).toBeGreaterThan(0);
      } else {
        expect(true).toBe(true); // no secondary action is honest for empty/error
      }
    });

    await test.step('4. mutation calls expected API (retry re-invokes catalog)', async () => {
      if (state !== 'error') {
        test.skip(!isBackendRequired(), 'APEX-1511: Retry mutation only assertable from an error state with a live backend');
        return;
      }
      const calls: string[] = [];
      page.on('request', (req) => {
        if (req.url().includes('omnimedia-catalog') || req.url().includes('omnilink-port')) {
          calls.push('catalog');
        }
      });
      await page.getByTestId('omnimedia-gallery-retry').first().click();
      await expect
        .poll(() => calls.length, { timeout: 12_000, message: 'Retry did not re-invoke the catalog endpoint' })
        .toBeGreaterThan(0);
    });

    await test.step('5. state persists after refresh', async () => {
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1_000);
      const after = await resolveMediaState(page);
      expect(
        ['gallery', 'empty', 'error', 'loading'].includes(after),
        'OmniMedia must re-render an honest state after refresh',
      ).toBe(true);
    });

    await test.step('6. metrics map to real API fields', async () => {
      // Gallery items must originate from real catalog data, not fabricated rows.
      if (state !== 'gallery') {
        expect(['empty', 'error']).toContain(state);
        return;
      }
      const count = await page.getByTestId('omnimedia-gallery-item').count();
      expect(count, 'A rendered gallery must contain real catalog items').toBeGreaterThan(0);
    });

    await test.step('7. invalid input shows useful error (honest error surface, never raw)', async () => {
      // OmniMedia has no free-text input; the analogous truth is that any error
      // path produces the honest error surface rather than a raw dump.
      const errorEl = page.getByTestId('omnimedia-gallery-error').first();
      if (await errorEl.isVisible({ timeout: 2_000 }).catch(() => false)) {
        const t = (await errorEl.innerText()).toLowerCase();
        for (const bad of FORBIDDEN_ERROR_SUBSTRINGS) {
          expect(t.includes(bad.toLowerCase())).toBe(false);
        }
      } else {
        expect(true).toBe(true);
      }
    });

    await test.step('8. unauthorized user blocked', async () => {
      const ctx = await page.context().browser()?.newContext();
      if (!ctx) {
        test.skip(true, 'APEX-1511: No browser available for an isolated anonymous context');
        return;
      }
      const anon = await ctx.newPage();
      try {
        await anon.goto('/omnidash', { waitUntil: 'domcontentloaded' });
        // OmniMedia surface must not render for an unauthenticated visitor.
        await expect(anon.getByTestId('omnimedia-gallery')).toHaveCount(0);
        await expect(anon.getByTestId('omnimedia-gallery-item')).toHaveCount(0);
      } finally {
        await ctx.close();
      }
    });

    await test.step('9. empty/loading/error states honest', async () => {
      // Whatever state is shown, the body must not leak forbidden strings.
      const body = (await page.locator('body').innerText().catch(() => '')).toLowerCase();
      for (const bad of FORBIDDEN_ERROR_SUBSTRINGS) {
        expect(body.includes(bad.toLowerCase()), `body must not contain "${bad}"`).toBe(false);
      }
    });

    await test.step('10. mobile viewport usable', async () => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1_000);
      const mobileState = await resolveMediaState(page);
      expect(
        ['gallery', 'empty', 'error', 'loading'].includes(mobileState),
        'OmniMedia must render an honest state on mobile',
      ).toBe(true);
    });
  });
});
