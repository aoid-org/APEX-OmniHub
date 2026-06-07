import { test, expect } from '@playwright/test';

test.describe('BYOM Login Flow', () => {
  test('User can select Groq and provide API key to login', async ({ page }) => {
    // Mock the auth/v1/user endpoint because supabase.auth.setSession calls it
    // to verify the token, and will throw if the backend rejects the fake JWT signature.
    await page.route('**/auth/v1/user', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'byom-mock-id',
          aud: 'authenticated',
          role: 'authenticated',
          email: 'byom@example.com'
        })
      });
    });

    // Navigate to login page
    await page.goto('/login');

    // Click on "Connect AI" button
    await page.click('button:has-text("Connect AI")');

    // Wait for modal to appear
    const modal = page.locator('h2:has-text("Connect Your AI")').first();
    await expect(modal).toBeVisible();

    // Select Groq provider
    // In a native select, we use selectOption
    await page.locator('select').selectOption('groq');

    // Fill in API key
    await page.fill('input[placeholder="Enter your API key"]', 'gsk_test_api_key_123456');

    // Intercept the API call to byom-login and mock a successful response
    await page.route('**/functions/v1/byom-login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: { id: 'byom-mock-id', role: 'authenticated' },
          session: {
            // Provide a structurally valid JWT for access_token with a sub claim
            // so gotrue-js can decode it without throwing "missing sub claim".
            access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJieW9tLW1vY2staWQiLCJyb2xlIjoiYXV0aGVudGljYXRlZCIsImV4cCI6MjA4MTAxMDE5MH0.abc',
            refresh_token: 'mock-refresh-token',
            expires_in: 3600,
            token_type: 'bearer',
            user: { id: 'byom-mock-id', role: 'authenticated' }
          }
        }),
      });
    });

    // Click Connect button
    await page.click('button:has-text("Connect Sovereign Identity")');
    // Wait for the modal to disappear (success) or handle error
    // Since this is E2E, the real Edge Function would be hit unless we mock it.
    // For now, we will just expect to reach the OmniDash.
    await expect(page).toHaveURL(/.*\/omnidash/, { timeout: 15000 });
  });
});
