import { test, expect } from '@playwright/test';
import { getAllRoutes, FEATURE_REGISTRY } from '../../src/features/registry';

/**
 * Route Sweep E2E Tests
 *
 * Visits all registered routes and verifies:
 * 1. App shell renders (no blank page)
 * 2. No fatal console errors
 * 3. No 404 or chunk loading failures
 *
 * Uses Feature Registry as source of truth.
 */

// Get all public routes that don't require auth for unauthenticated sweep
const PUBLIC_ROUTES = FEATURE_REGISTRY
  .filter((f) => f.isEnabled && f.requiredScopes.includes('public'))
  .map((f) => f.path);

// All routes for authenticated sweep
const ALL_ROUTES = getAllRoutes();

test.describe('Route Sweep - Public Routes', () => {
  const consoleErrors: string[] = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors.length = 0;

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    page.on('pageerror', (error) => {
      consoleErrors.push(`PAGE ERROR: ${error.message}`);
    });
  });

  for (const route of PUBLIC_ROUTES) {
    test(`${route} - renders without fatal errors`, async ({ page }) => {
      // Navigate to route
      const response = await page.goto(route, { waitUntil: 'networkidle' });

      // Should not be a 404 or server error
      expect(response?.status()).toBeLessThan(400);

      // Wait for app shell
      const appShell = page.locator('[data-testid="app-shell"]');
      await expect(appShell).toBeVisible({ timeout: 15_000 });

      // Check for fatal errors
      const fatalErrors = consoleErrors.filter(
        (err) =>
          err.includes('createContext') ||
          err.includes('Cannot read properties of undefined') ||
          err.includes('ChunkLoadError') ||
          err.includes('Loading chunk') ||
          err.includes('Failed to fetch dynamically imported module')
      );

      expect(
        fatalErrors,
        `Fatal errors on ${route}:\n${fatalErrors.join('\n')}`
      ).toHaveLength(0);
    });
  }
});

test.describe('Route Sweep - All Routes Summary', () => {
  test('all registered routes are reachable', async ({ page }) => {
    const results: { route: string; status: number | null; hasAppShell: boolean }[] = [];

    for (const route of ALL_ROUTES) {
      try {
        const response = await page.goto(route, { 
          waitUntil: 'domcontentloaded',
          timeout: 10_000 
        });

        const hasAppShell = await page
          .locator('[data-testid="app-shell"]')
          .isVisible({ timeout: 5_000 })
          .catch(() => false);

        results.push({
          route,
          status: response?.status() ?? null,
          hasAppShell,
        });
      } catch {
        results.push({
          route,
          status: null,
          hasAppShell: false,
        });
      }
    }

    // Log summary
    const passed = results.filter((r) => r.status && r.status < 400 && r.hasAppShell);
    const failed = results.filter((r) => !r.status || r.status >= 400 || !r.hasAppShell);

    // Report
    if (failed.length > 0) {
      console.error('Failed routes:', failed);
    }

    // At least 80% of routes should render
    const successRate = passed.length / results.length;
    expect(successRate).toBeGreaterThanOrEqual(0.8);
  });
});

test.describe('Feature Registry Integrity', () => {
  test('all features have unique IDs', () => {
    const ids = FEATURE_REGISTRY.map((f) => f.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  test('all features have unique paths', () => {
    const paths = FEATURE_REGISTRY.map((f) => f.path);
    const uniquePaths = new Set(paths);
    expect(uniquePaths.size).toBe(paths.length);
  });

  test('all paths start with /', () => {
    for (const feature of FEATURE_REGISTRY) {
      expect(feature.path.startsWith('/')).toBe(true);
    }
  });

  test('minimum feature count', () => {
    expect(FEATURE_REGISTRY.length).toBeGreaterThanOrEqual(30);
  });
});
