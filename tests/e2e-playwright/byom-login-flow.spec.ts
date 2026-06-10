import { test, expect } from '@playwright/test';

test.describe('BYOM Login Flow', () => {
  test('User can select Groq and provide API key to login', async ({ page }) => {
    // Phase 1: page load — user is NOT authenticated yet.
    // Return 401 so the LoginPage does NOT redirect away before the test starts.
    let loginCompleted = false;
    await page.route('**/auth/v1/user', async (route) => {
      if (!loginCompleted) {
        // Initial session check: unauthenticated → stay on login page
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'not authenticated' }),
        });
      } else {
        // Post-login verification: return mock user to complete the auth flow
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'byom-mock-id',
            aud: 'authenticated',
            role: 'authenticated',
            email: 'byom@example.com',
          }),
        });
      }
    });

    // Navigate to login page — should stay here (not redirect) with 401 mock
    await page.goto('/login');

    // Skip if the Connect AI feature is not enabled in this build
    const connectAiBtn = page.locator('button:has-text("Connect AI")');
    const btnVisible = await connectAiBtn.isVisible({ timeout: 5000 }).catch(() => false);
    if (!btnVisible) {
      test.skip();
      return;
    }

    // Click on "Connect AI" button
    await connectAiBtn.click();

    // Check if the modal opened. If Supabase is not configured with real credentials,
    // the app shows an error instead of the modal (hasSupabaseConfig guard).
    // In that case, skip gracefully — this test requires real Supabase credentials
    // to be baked into the build (VITE_SUPABASE_URL + real anon key).
    const modal = page.locator('h2:has-text("Connect Your AI")').first();
    const modalVisible = await modal.isVisible({ timeout: 3000 }).catch(() => false);
    if (!modalVisible) {
      test.skip();
      return;
    }

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
            user: { id: 'byom-mock-id', role: 'authenticated' },
          },
        }),
      });
    });

    // Switch auth mock to success mode before the login completes
    loginCompleted = true;

    // Click Connect button
    await page.click('button:has-text("Connect Sovereign Identity")');
    // Wait for the modal to disappear (success) or handle error
    // Since this is E2E, the real Edge Function would be hit unless we mock it.
    // For now, we will just expect to reach the OmniDash.
    await expect(page).toHaveURL(/.*\/omnidash/, { timeout: 15000 });
  });
});
