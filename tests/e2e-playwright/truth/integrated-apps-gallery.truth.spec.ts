/**
 * Integrated Apps Gallery — APEX Truth Test.
 *
 * The widget_apps panel is a DISPLAY-ONLY gallery: heading exactly
 * "Integrated Apps Gallery", owns NO connection flow, and must never
 * reintroduce the retired "Connections" / "Third-Party Connections" /
 * "Connected APEX Apps" split or any "Connect App" / "Add APEX App" CTA inside
 * it. Third-party connections belong to OmniBoard; first-party app onboarding
 * belongs to the APEX Apps MCP modal — neither is launched from this gallery.
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
} from '../helpers/auth';

const APP_URL = process.env.APP_URL ?? '/omnidash';

async function gallery(page: Page) {
  const widget = page.getByTestId('widget_apps');
  await widget.scrollIntoViewIfNeeded().catch(() => {});
  await expect(widget).toBeVisible({ timeout: 15_000 });
  return widget;
}

test.describe('Integrated Apps Gallery — APEX Truth Test', () => {
  test.beforeEach(async ({ page }) => {
    skipWithoutSupabaseConfig();
    await signInWithSupabaseSession(page);
    await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
  });

  test('gallery is truthful across all dimensions', async ({ page }) => {
    await test.step('1. loads with clear purpose', async () => {
      const widget = await gallery(page);
      await expect(widget.getByText('Integrated Apps Gallery', { exact: true })).toBeVisible();
      await expect(widget.getByTestId('integrated-apps')).toBeVisible();
    });

    await test.step('2. primary action works or honestly gated (display-only: NO primary CTA)', async () => {
      const widget = await gallery(page);
      // The honest truth here is the ABSENCE of a mutating CTA. The gallery
      // must not offer connect/add buttons — that is the contract.
      await expect(widget.getByRole('button', { name: /connect app/i })).toHaveCount(0);
      await expect(widget.getByRole('button', { name: /add apex app/i })).toHaveCount(0);
    });

    await test.step('3. secondary actions work or honestly gated (no nav-out)', async () => {
      const widget = await gallery(page);
      const inner = widget.getByTestId('integrated-apps');
      // Empty/awaiting slots are status tiles, never interactive launchers.
      await expect(inner.getByRole('button')).toHaveCount(0);
      await expect(inner.getByRole('link')).toHaveCount(0);
    });

    await test.step('4. mutation calls expected API (NONE — display-only, must open no modal)', async () => {
      const widget = await gallery(page);
      const inner = widget.getByTestId('integrated-apps');
      // Click anywhere safe inside the gallery — it must not launch a dialog.
      await inner.click({ position: { x: 5, y: 5 } }).catch(() => {});
      await expect(page.getByRole('dialog')).toHaveCount(0);
    });

    await test.step('5. state persists after refresh', async () => {
      await page.reload({ waitUntil: 'domcontentloaded' });
      const widget = await gallery(page);
      await expect(widget.getByText('Integrated Apps Gallery', { exact: true })).toBeVisible();
    });

    await test.step('6. metrics map to real API fields (tiles reflect real integration state)', async () => {
      const widget = await gallery(page);
      // The gallery renders integration tiles; their text must be real status,
      // never raw object/placeholder leakage.
      const text = (await widget.innerText().catch(() => '')).toLowerCase();
      for (const bad of ['[object object]', 'undefined', 'null', 'lorem ipsum']) {
        expect(text.includes(bad), `Gallery tile text must not contain "${bad}"`).toBe(false);
      }
    });

    await test.step('7. invalid input shows useful error (N/A — no input surface)', async () => {
      const widget = await gallery(page);
      await expect(widget.getByRole('textbox')).toHaveCount(0);
    });

    await test.step('8. unauthorized user blocked', async () => {
      // The gallery only renders inside authenticated /omnidash; anonymous
      // access is blocked by the OmniDash auth gate (see omnidash.truth.spec.ts).
      // Here we assert it is not exposed without a session via a fresh context.
      const ctx = await page.context().browser()?.newContext();
      if (!ctx) {
        test.skip(true, 'APEX-1511: No browser available for an isolated anonymous context');
        return;
      }
      const anon = await ctx.newPage();
      try {
        await anon.goto('/omnidash', { waitUntil: 'domcontentloaded' });
        await expect(anon.getByTestId('widget_apps')).toHaveCount(0);
      } finally {
        await ctx.close();
      }
    });

    await test.step('9. empty/loading/error states honest', async () => {
      const widget = await gallery(page);
      // The retired Connections split must not creep back as a "state".
      await expect(widget.getByText('Connections', { exact: true })).toHaveCount(0);
      await expect(widget.getByText('Third-Party Connections')).toHaveCount(0);
      await expect(widget.getByText('Connected APEX Apps')).toHaveCount(0);
      await expect(widget.getByTestId('connections-third-party')).toHaveCount(0);
      await expect(widget.getByTestId('connections-apex-apps')).toHaveCount(0);
    });

    await test.step('10. mobile viewport usable', async () => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.reload({ waitUntil: 'domcontentloaded' });
      const widget = await gallery(page);
      await expect(widget.getByText('Integrated Apps Gallery', { exact: true })).toBeVisible();
      // Still no CTA creep on mobile layout.
      await expect(widget.getByRole('button', { name: /connect app/i })).toHaveCount(0);
    });
  });
});
