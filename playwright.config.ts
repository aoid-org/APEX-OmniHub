import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for OmniLink APEX runtime smoke tests.
 *
 * These tests validate that the deployed app actually renders
 * and critical assets are accessible - catching issues like:
 * - React context duplication (createContext errors)
 * - 401/403 on manifest.webmanifest
 * - Blank page deployments
 */
export default defineConfig({
  testDir: './tests/e2e-playwright',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  // Fast timeout for smoke tests
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },

  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:4173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
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
  ],

  // Start preview server before running tests (only if BASE_URL not provided)
  // In CI, the workflow manages the server manually
  webServer: process.env.BASE_URL ? undefined : {
    command: 'npm run build && npm run preview',
    url: 'http://localhost:4173',
    reuseExistingServer: true,
    timeout: 300_000, // 5 minutes for build + preview startup
  },
});
