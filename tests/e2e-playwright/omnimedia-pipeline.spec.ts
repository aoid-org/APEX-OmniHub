/**
 * OmniMedia Pipeline — Batch 3b end-to-end proof.
 *
 * Proves the full real path: Files upload → omnimedia-ingest-from-upload →
 * omnimedia-catalog → catalog item visible in both the widget (compact) and
 * modal (full) galleries → click-to-play → real first-party HTMLMediaElement
 * playback (readyState>=2, currentTime advances, no media error).
 *
 * Supersedes the stale cp-08/cp-09 skip stubs (APEX-2008/2009): the wiring
 * those specs flagged as "pending" now exists.
 */
import { test, expect, type Page } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { signInWithSupabaseSession, skipWithoutSupabaseConfig } from './helpers/auth';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FATAL = /createContext|Cannot read properties of undefined|ChunkLoadError|Failed to fetch dynamically imported module/;
const FIXTURE_PATH = path.resolve(__dirname, '../fixtures/media/apex-omnimedia-smoke.mp4');
const FIXTURE_TITLE = 'apex-omnimedia-smoke.mp4';

function trackRequests(page: Page): string[] {
  const calls: string[] = [];
  page.on('request', (req) => {
    if (req.url().includes('omnilink-port')) calls.push(req.url());
  });
  return calls;
}

function trackConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(`PAGEERROR: ${e.message}`));
  return errors;
}

test.describe('OmniMedia Pipeline — upload, catalog, playback', () => {
  test.beforeEach(async ({ page }) => {
    skipWithoutSupabaseConfig();
    await signInWithSupabaseSession(page);
  });

  test('uploaded video routes to omnimedia-assets, appears in catalog, and plays back', async ({ page }) => {
    const portCalls = trackRequests(page);
    const errors = trackConsoleErrors(page);

    const sidebar = page.locator('.omni-sidebar');
    const hasSidebar = await sidebar.isVisible({ timeout: 8_000 }).catch(() => false);
    test.skip(!hasSidebar, 'APEX-1001: Sidebar is desktop-only — this pipeline requires the desktop right-panel widget.');

    let uploaded = false;
    let deleted = false;

    try {
      // ── Upload via Files module ──────────────────────────────────────────
      await page.getByRole('button', { name: 'Files', exact: true }).click();
      const filesDialog = page.getByRole('dialog');
      await expect(filesDialog).toBeVisible({ timeout: 10_000 });

      await filesDialog.locator('input[type="file"]').setInputFiles(FIXTURE_PATH);
      await filesDialog.getByRole('button', { name: 'Upload', exact: true }).click();

      await expect.poll(
        () => portCalls.some((u) => u.includes('omnimedia-ingest-from-upload')),
        { timeout: 15_000, message: 'omnimedia-ingest-from-upload was never called' },
      ).toBe(true);
      uploaded = true;

      await page.keyboard.press('Escape');
      await expect(filesDialog).not.toBeVisible({ timeout: 5_000 });

      // ── Catalog refetch (widget gallery, compact) ────────────────────────
      await expect.poll(
        () => portCalls.some((u) => u.includes('omnimedia-catalog')),
        { timeout: 15_000, message: 'omnimedia-catalog was never called after upload' },
      ).toBe(true);

      const widgetItem = page
        .getByTestId('rt_security')
        .getByTestId('omnimedia-gallery-item')
        .filter({ hasText: FIXTURE_TITLE });
      await expect(widgetItem).toBeVisible({ timeout: 15_000 });

      // ── Full modal gallery shows the same item ───────────────────────────
      await page.getByTestId('omnimedia-open-button').click();
      const mediaDialog = page.getByRole('dialog').filter({ has: page.getByTestId('omnimedia-module') });
      await expect(mediaDialog).toBeVisible({ timeout: 10_000 });

      const fullItem = mediaDialog.getByTestId('omnimedia-gallery-item').filter({ hasText: FIXTURE_TITLE });
      await expect(fullItem).toBeVisible({ timeout: 15_000 });

      // ── Click-to-play: real first-party HTMLVideoElement ─────────────────
      await fullItem.getByRole('button', { name: `Play ${FIXTURE_TITLE}` }).click();

      const video = mediaDialog.locator('video');
      await expect(video).toBeVisible({ timeout: 10_000 });

      await expect.poll(
        async () => video.evaluate((el: HTMLVideoElement) => el.readyState),
        { timeout: 15_000, message: 'video never reached readyState>=2 (HAVE_CURRENT_DATA)' },
      ).toBeGreaterThanOrEqual(2);

      const errorState = await video.evaluate((el: HTMLVideoElement) => el.error);
      expect(errorState).toBeNull();

      const t0 = await video.evaluate((el: HTMLVideoElement) => el.currentTime);
      await page.waitForTimeout(800);
      const t1 = await video.evaluate((el: HTMLVideoElement) => el.currentTime);
      expect(t1).toBeGreaterThan(t0);

      // ── Cleanup ───────────────────────────────────────────────────────────
      await fullItem.getByRole('button', { name: `Delete ${FIXTURE_TITLE}` }).click();
      await expect(fullItem).not.toBeVisible({ timeout: 10_000 });
      deleted = true;

      expect(errors.filter((e) => FATAL.test(e))).toHaveLength(0);
    } finally {
      if (uploaded && !deleted) {
        // Best-effort cleanup if an assertion above threw before the in-test delete ran.
        const cleanupItem = page.getByTestId('omnimedia-gallery-item').filter({ hasText: FIXTURE_TITLE }).first();
        await cleanupItem.getByRole('button', { name: `Delete ${FIXTURE_TITLE}` }).click({ timeout: 5_000 }).catch(() => {});
      }
    }
  });
});
