import { defineConfig, devices } from '@playwright/test';
import path from 'path';

/**
 * Playwright configuration for OmniLink APEX runtime smoke tests.
 *
 * These tests validate that the deployed app actually renders
 * and critical assets are accessible - catching issues like:
 * - React context duplication (createContext errors)
 * - 401/403 on manifest.webmanifest
 * - Blank page deployments
 *
 * CI runs chromium-only for reliability (Firefox/WebKit require OS-level
 * dependencies that aren't available on all CI runners). Full cross-browser
 * testing runs locally.
 */

const isCI = !!process.env.CI;

const allProjects = [
  // ── Desktop ───────────────────────────────────────────────────────────
  {
    name: 'chromium',
    use: { ...devices['Desktop Chrome'] },
  },
  {
    name: 'firefox',
    use: { ...devices['Desktop Firefox'] },
  },

  // ── Mobile — primary OmniLink targets ────────────────────────────────
  {
    name: 'mobile-chrome',
    use: {
      ...devices['Pixel 7'],
      viewport: { width: 393, height: 851 },
    },
  },
  {
    name: 'mobile-safari',
    use: {
      ...devices['iPhone 14'],
      viewport: { width: 390, height: 844 },
    },
  },

  // ── Tablet ────────────────────────────────────────────────────────────
  {
    name: 'tablet-ipad',
    use: { ...devices['iPad Pro 11'] },
  },
];

// CI: chromium-based projects only (chromium + mobile-chrome), pinned to the
// runner's preinstalled Google Chrome via `channel: 'chrome'`. Playwright's
// bundled-Chromium download from its CDN reliably hangs after reaching 100% on
// CI runners; the system channel sidesteps that download entirely.
// Local: all browsers including Firefox and WebKit (bundled, no channel).
const ciProjects = allProjects
  .filter((p) => ['chromium', 'mobile-chrome'].includes(p.name))
  .map((p) => ({
    ...p,
    use: { ...p.use, channel: 'chrome' },
  }));

export default defineConfig({
  testDir: './tests/e2e-playwright',
  globalSetup: path.resolve('./tests/e2e-playwright/global-setup.ts'),
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 3 : undefined,
  reporter: isCI ? [['list'], ['html']] : 'html',

  // Per-test timeout. Most smoke tests finish in seconds; the route-sweep summary
  // visits every registered route serially (slower under mobile-chrome emulation),
  // so the ceiling must cover it. Per-test overrides (test.setTimeout /
  // describe.configure) are not honored on these CI runners, so the budget lives here.
  timeout: 180_000,
  expect: {
    timeout: 10_000,
  },

  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:4173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: isCI ? ciProjects : allProjects,

  // Start preview server before running tests (only if BASE_URL not provided)
  // In CI, the workflow manages the server manually
  webServer: process.env.BASE_URL ? undefined : {
    command: 'npm run build && npm run preview',
    url: 'http://localhost:4173',
    reuseExistingServer: true,
    timeout: 300_000, // 5 minutes for build + preview startup
  },
});
