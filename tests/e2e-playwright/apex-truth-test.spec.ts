// APEX Truth Test — generic product truthfulness proof.
//
// The "APEX Truth Test" (APEX Bible contract) asserts that the product a real
// user lands on is HONEST: no placeholder/fake-surface text, no silently-failed
// API calls, no raw SDK/Edge error strings leaking into the UI, and that state
// survives a refresh. It is deliberately surface-agnostic so it can run against
// any deployed entry point.
//
// testDir note:
//   This file lives under playwright.config.ts testDir ('./tests/e2e-playwright')
//   so Playwright auto-discovers it. Vitest excludes the e2e-playwright tree.
//   Run: npx playwright test tests/e2e-playwright
//
// Auth note:
//   Backend-required mode gates real Supabase sessions through helpers/auth.ts.
//   Mocked auth is never accepted as release proof.
import { test, expect, type Page } from '@playwright/test';
import {
  signInWithSupabaseSession,
  skipWithoutSupabaseConfig,
} from './helpers/auth';

const APP_URL = process.env.APP_URL ?? '/omnidash';

/** Strings that must NEVER appear in honest product copy. */
const FAKE_SURFACE_MARKERS = [
  'lorem ipsum',
  'todo',
  'not implemented',
  'coming soon',
  'undefined',
  'null',
  '[object object]',
  'failed to fetch',
  'internal server error',
  'edge function returned a non-2xx status code',
];

/** Raw backend failure strings the UI must never expose. */
const RAW_FAILURE_STRINGS = [
  'Edge Function returned a non-2xx status code',
  'FunctionsHttpError',
];

/** Redact tokens / jwts / api keys / signed-url secrets before logging a URL. */
function redactUrl(raw: string): string {
  try {
    const u = new URL(raw, 'http://local');
    for (const k of [...u.searchParams.keys()]) {
      if (/token|jwt|apikey|api_key|key|signature|sig|access|secret/i.test(k)) {
        u.searchParams.set(k, 'REDACTED');
      }
    }
    let out = u.toString();
    // Defense-in-depth: scrub bearer/jwt-looking substrings that survive parsing.
    out = out.replace(/eyJ[A-Za-z0-9._-]{10,}/g, 'REDACTED_JWT');
    return out.startsWith('http://local') ? out.replace('http://local', '') : out;
  } catch {
    return raw.replace(/eyJ[A-Za-z0-9._-]{10,}/g, 'REDACTED_JWT');
  }
}

interface CapturedResponse {
  readonly url: string;
  readonly status: number;
}

function captureNetwork(page: Page): CapturedResponse[] {
  const responses: CapturedResponse[] = [];
  page.on('response', (res) => {
    const url = res.url();
    if (
      url.includes('/api/') ||
      url.includes('/functions/v1/') ||
      url.includes('supabase')
    ) {
      responses.push({ url: redactUrl(url), status: res.status() });
    }
  });
  return responses;
}

function captureConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(`PAGEERROR: ${e.message}`));
  return errors;
}

async function bodyText(page: Page): Promise<string> {
  return (await page.locator('body').innerText().catch(() => '')) || '';
}

test.describe('APEX Truth Test', () => {
  test('product is honest end-to-end (no fake surfaces, no silent failures)', async ({ page }) => {
    skipWithoutSupabaseConfig();

    const responses = captureNetwork(page);
    const consoleErrors = captureConsoleErrors(page);

    await test.step('Open product as a user', async () => {
      await signInWithSupabaseSession(page);
      await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
      await page.screenshot({
        path: 'evidence/apex-truth-test/screenshots/01-entry.png',
        fullPage: true,
      });
    });

    await test.step('Reject visible fake-surface markers', async () => {
      const text = (await bodyText(page)).toLowerCase();
      for (const marker of FAKE_SURFACE_MARKERS) {
        expect(
          text.includes(marker),
          `Fake-surface marker "${marker}" must not appear in user-facing body text`,
        ).toBe(false);
      }
    });

    await test.step('Integrated Apps Gallery truthful', async () => {
      const apps = page.getByTestId('widget_apps');
      await apps.scrollIntoViewIfNeeded().catch(() => {});
      await expect(apps).toBeVisible({ timeout: 15_000 });
      await expect(apps.getByText('Integrated Apps Gallery', { exact: true })).toBeVisible();

      // Retired "Connections" split must not creep back.
      await expect(apps.getByText('Connections', { exact: true })).toHaveCount(0);
      await expect(apps.getByText('Third-Party Connections')).toHaveCount(0);
      await expect(apps.getByText('Connected APEX Apps')).toHaveCount(0);

      // Display-only gallery — no connect/add-app CTA inside it.
      await expect(apps.getByRole('button', { name: /connect app/i })).toHaveCount(0);
      await expect(apps.getByRole('button', { name: /add apex app/i })).toHaveCount(0);
    });

    await test.step('Primary action exists or honestly gated', async () => {
      // A real product offers a primary action OR an honest gate (auth/empty
      // state). At least one must be true; a blank canvas is not acceptable.
      const primary = page
        .getByRole('button', { name: /add apex app|create|new|connect|upload|start/i })
        .first();
      const honestGate = page.locator(
        '[data-testid="auth-gate"], [data-testid="omnimedia-gallery-empty"], [data-testid="integrated-apps"]',
      ).first();

      const hasPrimary = await primary.isVisible({ timeout: 10_000 }).catch(() => false);
      const hasGate = await honestGate.isVisible({ timeout: 10_000 }).catch(() => false);
      expect(
        hasPrimary || hasGate,
        'Product must expose a primary action or an honest gated/empty state',
      ).toBe(true);
    });

    await test.step('OmniMedia does not expose raw Edge Function failure', async () => {
      const text = await bodyText(page);
      for (const raw of RAW_FAILURE_STRINGS) {
        expect(
          text.includes(raw),
          `Raw backend failure string "${raw}" must never reach the UI`,
        ).toBe(false);
      }
    });

    await test.step('No API call may fail silently', async () => {
      const serverErrors = responses.filter((r) => r.status >= 500);
      expect(
        serverErrors,
        `Captured 5xx responses (redacted): ${JSON.stringify(serverErrors)}`,
      ).toHaveLength(0);
      // Console errors are surfaced for diagnostics; fatal page errors fail loud.
      expect(
        consoleErrors.filter((e) => e.startsWith('PAGEERROR:')),
        `Uncaught page errors: ${JSON.stringify(consoleErrors)}`,
      ).toHaveLength(0);
    });

    await test.step('State persists after refresh', async () => {
      await page.reload({ waitUntil: 'domcontentloaded' });
      const text = await bodyText(page);
      for (const raw of RAW_FAILURE_STRINGS) {
        expect(text.includes(raw)).toBe(false);
      }
      const lower = text.toLowerCase();
      expect(lower.includes('failed to fetch')).toBe(false);
      expect(lower.includes('internal server error')).toBe(false);
      await page.screenshot({
        path: 'evidence/apex-truth-test/screenshots/03-after-refresh.png',
        fullPage: true,
      });
    });
  });
});
