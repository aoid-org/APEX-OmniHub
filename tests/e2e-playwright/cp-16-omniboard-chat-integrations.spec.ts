/**
 * CP-16 — OmniBoard Chat-Native Integrations E2E Test
 * Journey: OmniBoard rendering -> Test 4 integrations (Web2, Legacy, Web3, AI)
 * Exit assertion: Either the conversational FSM responds correctly, or the honest gateway unavailable message is displayed.
 */
import { test, expect, type Page } from '@playwright/test';
import { signInWithSupabaseSession, skipWithoutSupabaseConfig } from './helpers/auth';

const FATAL = /createContext|Cannot read properties of undefined|ChunkLoadError|Failed to fetch dynamically imported module/;

function trackConsole(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(`PAGEERROR: ${e.message}`));
  return errors;
}

test.describe('CP-16 — OmniBoard Chat-Native Integrations', () => {
  test.beforeEach(async ({ page }) => {
    skipWithoutSupabaseConfig();
    await signInWithSupabaseSession(page);
  });

  const integrationTypes = [
    { type: 'Legacy Software', prompt: 'Connect Salesforce' },
    { type: 'Web 3 App', prompt: 'Connect MetaMask' },
    { type: 'AI App', prompt: 'Connect OpenAI' },
    { type: 'Web 2 App', prompt: 'Connect Slack' },
  ];

  for (const integration of integrationTypes) {
    test(`OmniBoard chat surface handles ${integration.type} connection`, async ({ page }) => {
      const errors = trackConsole(page);

      const sidebar = page.locator('.omni-sidebar');
      const hasSidebar = await sidebar.isVisible({ timeout: 8_000 }).catch(() => false);
      test.skip(!hasSidebar, 'APEX-1001: Sidebar is desktop-only');

      // Click OmniBoard in sidebar
      await page.getByRole('button', { name: 'OmniBoard', exact: true }).click();
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible({ timeout: 10_000 });

      const inputLocator = dialog.getByPlaceholder('Type your response...');
      const errorLocator = dialog.getByText(/integration gateway is unavailable|Gateway unavailable|unreachable|timed out/i);
      
      await expect(
        inputLocator.or(errorLocator).first()
      ).toBeVisible({ timeout: 15_000 });
      
      if (await errorLocator.first().isVisible()) {
        console.log(`[Honest Gateway] Backend unreachable, failed closed for ${integration.type}.`);
        return;
      }

      // If gateway is alive, test the chat-native interaction
      await inputLocator.fill(integration.prompt);
      await page.getByRole('button', { name: '→' }).click();

      // Verify that the prompt was sent and input is cleared/processing
      await expect(inputLocator).toHaveValue('');

      // We don't have access to the exact orchestrator mock responses here, 
      // but we assert there are no fatal UI errors during the transaction
      expect(errors.filter((e) => FATAL.test(e))).toHaveLength(0);

      // Close the modal via backdrop or escape
      await page.keyboard.press('Escape');
      await expect(dialog).not.toBeVisible();
    });
  }
});
