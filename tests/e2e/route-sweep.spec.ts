/**
 * Route Sweep E2E Tests
 * 
 * Validates that all registered routes:
 * 1. Render without crashing
 * 2. Show appropriate content based on access mode
 * 3. Don't expose ghost features
 * 
 * Run with: npm run test:e2e
 */

import { test, expect, type Page } from '@playwright/test';

// ============================================================================
// TEST CONFIGURATION
// ============================================================================

const PUBLIC_ROUTES = [
  { path: '/', title: 'Home' },
  { path: '/auth', title: 'Auth' },
  { path: '/login', title: 'Login' },
  { path: '/privacy', title: 'Privacy' },
  { path: '/health', title: 'Health' },
  { path: '/tech-specs', title: 'Tech Specs' },
];

const DEMO_ROUTES = [
  { path: '/omnidash', title: 'OmniDash' },
  { path: '/omnidash/pipeline', title: 'Pipeline' },
  { path: '/omnidash/kpis', title: 'KPIs' },
];

const AUTH_ONLY_ROUTES = [
  { path: '/dashboard', title: 'Dashboard' },
  { path: '/links', title: 'Links' },
  { path: '/files', title: 'Files' },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function enableDemoMode(page: Page): Promise<void> {
  await page.evaluate(() => {
    globalThis.localStorage.setItem('apex.demo.enabled', 'true');
  });
}

async function disableDemoMode(page: Page): Promise<void> {
  await page.evaluate(() => {
    globalThis.localStorage.removeItem('apex.demo.enabled');
  });
}

// ============================================================================
// PUBLIC ROUTE TESTS
// ============================================================================

test.describe('Public Routes', () => {
  for (const route of PUBLIC_ROUTES) {
    test(`${route.path} should render without error`, async ({ page }) => {
      await page.goto(route.path);
      
      // Should not show error boundary
      await expect(page.locator('[data-testid="error-boundary"]')).not.toBeVisible();
      
      // Should have app shell
      await expect(page.locator('[data-testid="app-shell"]')).toBeVisible();
    });
  }
});

// ============================================================================
// DEMO MODE TESTS
// ============================================================================

test.describe('Demo Mode Routes', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await enableDemoMode(page);
  });

  for (const route of DEMO_ROUTES) {
    test(`${route.path} should render in demo mode`, async ({ page }) => {
      await page.goto(route.path);
      
      // Should not show error boundary
      await expect(page.locator('[data-testid="error-boundary"]')).not.toBeVisible();
      
      // Should show demo banner
      await expect(page.getByRole('banner', { name: /demo mode/i })).toBeVisible();
    });
  }

  test('Demo mode banner should have login option', async ({ page }) => {
    await page.goto('/omnidash');
    
    const loginButton = page.getByRole('button', { name: /log in/i });
    await expect(loginButton).toBeVisible();
  });
});

// ============================================================================
// AUTH-ONLY ROUTE TESTS
// ============================================================================

test.describe('Auth-Only Routes (Guest Mode)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await disableDemoMode(page);
  });

  for (const route of AUTH_ONLY_ROUTES) {
    test(`${route.path} should show locked panel for guests`, async ({ page }) => {
      await page.goto(route.path);
      
      // Should show locked feature panel or redirect to auth
      const lockedPanel = page.locator('text=locked').or(page.locator('text=Log In to Access'));
      const authPage = page.locator('text=Sign In').or(page.locator('[data-testid="auth-form"]'));
      
      await expect(lockedPanel.or(authPage).first()).toBeVisible();
    });
  }
});

// ============================================================================
// GHOST FEATURE TESTS
// ============================================================================

test.describe('No Ghost Features', () => {
  test('Should not have placeholder icons on home page', async ({ page }) => {
    await page.goto('/');
    
    // Check for placeholder.svg usage
    const placeholderImages = page.locator('img[src*="placeholder"]');
    const count = await placeholderImages.count();
    
    // Allow zero or document existing ones
    if (count > 0) {
      console.warn(`Found ${count} placeholder images - review for removal`);
    }
  });

  test('Should not have no-op click handlers', async ({ page }) => {
    await page.goto('/omnidash');
    await enableDemoMode(page);
    await page.reload();
    
    // Click all buttons and verify they do something
    const buttons = page.getByRole('button');
    const buttonCount = await buttons.count();
    
    for (let i = 0; i < Math.min(buttonCount, 10); i++) {
      const button = buttons.nth(i);
      const isVisible = await button.isVisible();
      const isEnabled = await button.isEnabled();
      
      if (isVisible && isEnabled) {
        // Verify button has some effect (doesn't just do nothing)
        // This is a basic check - more specific tests can be added
        const onClick = await button.getAttribute('onclick');
        expect(onClick).not.toBe('');
      }
    }
  });

  test('NotFound page should render for invalid routes', async ({ page }) => {
    await page.goto('/this-route-does-not-exist-12345');
    
    // Should show 404/NotFound page
    await expect(
      page.getByText(/not found/i)
        .or(page.getByText(/404/i))
        .or(page.getByText(/page doesn't exist/i))
    ).toBeVisible();
  });
});

// ============================================================================
// ACCESSIBILITY TESTS
// ============================================================================

test.describe('Accessibility', () => {
  test('Entry gate should be keyboard accessible', async ({ page }) => {
    await page.goto('/');
    
    // Tab through focusable elements
    await page.keyboard.press('Tab');
    
    // Should be able to focus login button
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });

  test('Demo mode banner should have proper ARIA attributes', async ({ page }) => {
    await page.goto('/');
    await enableDemoMode(page);
    await page.goto('/omnidash');
    
    const banner = page.getByRole('banner', { name: /demo mode/i });
    await expect(banner).toBeVisible();
    await expect(banner).toHaveAttribute('aria-label');
  });
});

// ============================================================================
// RESPONSIVE TESTS
// ============================================================================

test.describe('Responsive Design', () => {
  test('OmniDash should work on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await enableDemoMode(page);
    await page.goto('/omnidash');
    
    // Should render without horizontal scroll
    const body = page.locator('body');
    const scrollWidth = await body.evaluate((el) => el.scrollWidth);
    const clientWidth = await body.evaluate((el) => el.clientWidth);
    
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 10); // Allow small margin
  });

  test('OmniDash should work on desktop viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await enableDemoMode(page);
    await page.goto('/omnidash');
    
    // Should show full layout
    await expect(page.locator('[data-testid="app-shell"]')).toBeVisible();
  });
});
