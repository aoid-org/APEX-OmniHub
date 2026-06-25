import { test, expect } from '@playwright/test';

test.describe('BYOM Login Flow', () => {
  test.skip('User can select Groq and provide API key to login', async ({ page }) => { // APEX-8014
    test.info().annotations.push({ type: 'issue', description: 'BLOCKED(APEX-8014): BYOM Groq selection flow altered' });


    await page.goto('/login');

    const connectAiBtn = page.locator('button:has-text("Connect AI")');
    await expect(connectAiBtn).toBeVisible({ timeout: 5000 });

    // Click on "Connect AI" button
    await connectAiBtn.click();

    const modal = page.locator('h2:has-text("Connect Your AI")').first();
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Select Groq provider
    // In a native select, we use selectOption
    await page.locator('select').selectOption('groq');

    // Fill in API key
    await page.fill('#api-key-input', 'gsk_e2e_test_key_9876543210');

    // Click Connect button
    await page.click('button:has-text("Connect Sovereign Identity")');
    
    // Wait for the modal to disappear (success) or handle error
    // Since this is E2E, the real Edge Function would be hit unless we mock it.
    // For now, we will just expect to reach the OmniDash.
    await expect(page).toHaveURL(/.*\/omnidash/, { timeout: 15000 });
  });
});
