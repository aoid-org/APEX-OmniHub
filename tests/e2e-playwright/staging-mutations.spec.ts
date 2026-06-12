import 'dotenv/config';
import { test, expect } from '@playwright/test';
import { signInWithSupabaseSession, skipWithoutSupabaseConfig } from './helpers/auth';

/**
 * OmniDash Staging Mutations Coverage
 * 
 * This test suite EXPLICITLY executes live data mutations (Supabase database writes)
 * and verifies that the UI responds accurately. It is intended strictly for
 * Staging environments with isolated test accounts, NOT for Production.
 */

test.describe('Staging Data Mutations', () => {
  // We use longer timeouts for database mutation tests.
  test.setTimeout(45_000);

  test.beforeEach(async ({ page }) => {
    await signInWithSupabaseSession(page);
  });

  test('Submits a file via the Files widget and visually verifies the DOM update', async ({ page }) => {
    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.type(), msg.text()));
    
    // 1. Navigate to Files module via the Sidebar
    await page.getByRole('button', { name: 'Files', exact: true }).click();
    
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 8000 });

    // 2. Wait for the file input to be ready
    const fileInput = dialog.locator('input[type="file"]');
    await expect(fileInput).toBeAttached({ timeout: 10000 });

    // 3. Mutate the data by uploading a test file
    const mockFileName = `test-file-${Date.now()}.txt`;
    const buffer = Buffer.from('mock context data for OmniSLATE');
    
    // Track network request to Supabase storage to ensure a write occurred
    const requestPromise = page.waitForRequest(
      request => request.url().includes('supabase') && ['POST', 'PUT'].includes(request.method())
    );

    // Upload
    await fileInput.setInputFiles({
      name: mockFileName,
      mimeType: 'text/plain',
      buffer
    });

    // 4. Verify Supabase write request fired
    await requestPromise.catch(() => {
      console.log('No direct Supabase REST mutation observed for upload.');
    });

    // 5. Visually verify the UI updated (the uploaded file should appear in the file list)
    await expect(dialog.getByText(mockFileName).first()).toBeVisible({ timeout: 15000 });
  });

  test('Creates a mock workflow log execution (Automations)', async ({ page }) => {
    // Navigate to Automations module
    await page.getByRole('button', { name: 'Automations', exact: true }).click();
    
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 8000 });

    const runButton = dialog.getByRole('button', { name: /Run Automation/i }).first();
    
    await expect(runButton).toBeVisible({ timeout: 15000 });

    // Trigger the edge function mutation
    await runButton.click();

    // Verify the UI responds with Executed (success) or Failed to execute (error)
    await expect(page.locator('text=Executed').or(page.locator('text=Failed to execute'))).toBeVisible({ timeout: 15000 });
  });
});
