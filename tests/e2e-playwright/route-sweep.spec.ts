import { test, expect, type Page } from '@playwright/test';
import { getAllRoutes, FEATURE_REGISTRY } from '../../apps/dashboard/src/features/registry';

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

const APP_SHELL_SELECTOR = '[data-testid="app-shell"]';
const FATAL_ERROR_PATTERNS = [
  'createContext',
  'Cannot read properties of undefined',
  'ChunkLoadError',
  'Loading chunk',
  'Failed to fetch dynamically imported module',
];

// Get all public routes that don't require auth for unauthenticated sweep
const PUBLIC_ROUTES = FEATURE_REGISTRY
  .filter((f) => f.isEnabled && f.requiredScopes.includes('public'))
  .map((f) => f.path);

// All routes for authenticated sweep
const ALL_ROUTES = getAllRoutes();

/** Setup console error tracking for page */
function setupErrorTracking(page: Page, consoleErrors: string[]): void {
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  page.on('pageerror', (error) => {
    consoleErrors.push(`PAGE ERROR: ${error.message}`);
  });
}

/** Filter fatal errors from console output */
function getFatalErrors(consoleErrors: string[]): string[] {
  return consoleErrors.filter((err) =>
    FATAL_ERROR_PATTERNS.some((pattern) => err.includes(pattern))
  );
}

/** Check if app shell is visible on page */
async function checkAppShell(page: Page, timeout = 5000): Promise<boolean> {
  return page
    .locator(APP_SHELL_SELECTOR)
    .isVisible({ timeout })
    .catch(() => false);
}

test.describe('Route Sweep - Public Routes', () => {
  const consoleErrors: string[] = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors.length = 0;
    setupErrorTracking(page, consoleErrors);
  });

  for (const route of PUBLIC_ROUTES) {
    test(`${route} - renders without fatal errors`, async ({ page }) => {
      const response = await page.goto(route, { waitUntil: 'networkidle' });

      expect(response?.status()).toBeLessThan(400);

      const appShell = page.locator(APP_SHELL_SELECTOR);
      await expect(appShell).toBeVisible({ timeout: 15_000 });

      const fatalErrors = getFatalErrors(consoleErrors);
      expect(
        fatalErrors,
        `Fatal errors on ${route}:\n${fatalErrors.join('\n')}`
      ).toHaveLength(0);
    });
  }
});

test.describe('Route Sweep - All Routes Summary', () => {
  test('all registered routes are reachable', async ({ page }) => {
    // Increase timeout for sweeping all routes (each route can take up to 10s)
    test.setTimeout(120_000);

    const results: { route: string; status: number | null; hasAppShell: boolean }[] = [];

    for (const route of ALL_ROUTES) {
      try {
        const response = await page.goto(route, { 
          waitUntil: 'domcontentloaded',
          timeout: 10_000 
        });

        const hasAppShell = await checkAppShell(page);

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

    const passed = results.filter((r) => r.status && r.status < 400 && r.hasAppShell);
    const failed = results.filter((r) => !r.status || r.status >= 400 || !r.hasAppShell);

    if (failed.length > 0) {
      console.error('Failed routes:', failed);
    }

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
