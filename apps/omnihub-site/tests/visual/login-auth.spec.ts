import { test, expect } from '@playwright/test';

test.describe('Login authentication flow', () => {
  test('submits credentials and redirects on successful auth', async ({ page }) => {
    await page.route('**/auth/v1/token**', async (route) => {
      if (route.request().method() !== 'POST') {
        return route.continue();
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'test-access-token',
          token_type: 'bearer',
          expires_in: 3600,
          refresh_token: 'test-refresh-token',
          user: {
            id: '00000000-0000-0000-0000-000000000001',
            aud: 'authenticated',
            role: 'authenticated',
            email: 'user@example.com',
            email_confirmed_at: '2024-01-01T00:00:00Z',
            phone: '',
            confirmed_at: '2024-01-01T00:00:00Z',
            last_sign_in_at: '2024-01-01T00:00:00Z',
            app_metadata: { provider: 'email', providers: ['email'] },
            user_metadata: {},
            identities: [],
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
        }),
      });
    });

    await page.goto('/login.html');
    await page.getByLabel('Email').fill('user@example.com');
    await page.getByLabel('Password').fill('test-pass-123');
    await page.getByRole('button', { name: 'Sign In' }).click();

    await expect(page).toHaveURL(/\/omnidash$/);
  });
});
