/**
 * Integrated Apps Gallery wiring (Hotfix — reverts the PR #1510 "Connections"
 * split). The center-canvas widget_apps panel is a DISPLAY-ONLY gallery: it
 * owns no connection flow, opens no modal, and must never reintroduce the
 * retired "Third-Party Connections" / "Connected APEX Apps" split or its
 * "+ Connect App" CTA. OmniBoard (sidebar nav) remains the sole owner of
 * third-party connections; the APEX Ecosystem widget's "Add APEX App" remains
 * the sole entry point into the first-party APEX Apps MCP modal — see
 * omnidash-modal-contract.spec.ts for that assertion.
 */
import { test, expect } from '@playwright/test';
import { signInWithSupabaseSession, skipWithoutSupabaseConfig } from './helpers/auth';

test.describe('Integrated Apps Gallery (display-only — owns no connection flow)', () => {
  test.beforeEach(async ({ page }) => {
    skipWithoutSupabaseConfig();
    await signInWithSupabaseSession(page);
  });

  test('renders as a single read-only gallery in the main canvas', async ({ page }) => {
    const appsWidget = page.getByTestId('widget_apps');
    await appsWidget.scrollIntoViewIfNeeded();
    await expect(appsWidget.getByText('Integrated Apps Gallery', { exact: true })).toBeVisible();
    await expect(appsWidget.getByTestId('integrated-apps')).toBeVisible();
  });

  test('guardrail — the retired Connections split must not creep back', async ({ page }) => {
    const appsWidget = page.getByTestId('widget_apps');
    await appsWidget.scrollIntoViewIfNeeded();
    await expect(appsWidget.getByText('Connections', { exact: true })).toHaveCount(0);
    await expect(appsWidget.getByText('Third-Party Connections')).toHaveCount(0);
    await expect(appsWidget.getByText('Connected APEX Apps')).toHaveCount(0);
    await expect(appsWidget.getByTestId('connections-third-party')).toHaveCount(0);
    await expect(appsWidget.getByTestId('connections-apex-apps')).toHaveCount(0);
  });

  test('guardrail — no Connect App CTA and no Add APEX App duplicate in the gallery', async ({ page }) => {
    const appsWidget = page.getByTestId('widget_apps');
    await appsWidget.scrollIntoViewIfNeeded();
    await expect(appsWidget.getByRole('button', { name: /connect app/i })).toHaveCount(0);
    await expect(appsWidget.getByRole('button', { name: /add apex app/i })).toHaveCount(0);
  });

  test('guardrail — awaiting/empty slots are non-interactive, not connection CTAs', async ({ page }) => {
    const appsWidget = page.getByTestId('widget_apps');
    await appsWidget.scrollIntoViewIfNeeded();
    const gallery = appsWidget.getByTestId('integrated-apps');
    // Empty slots render as plain status tiles — never as buttons/links that
    // would open OmniBoard, the APEX Apps MCP, or any other modal.
    await expect(gallery.getByRole('button')).toHaveCount(0);
    await expect(gallery.getByRole('link')).toHaveCount(0);
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });
});
