import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.APEX_PROD_URL || 'https://apexomnihub.icu';

export default defineConfig({
  testDir: './tests/e2e-playwright',
  testMatch: 'production-safe.live.ts',
  fullyParallel: false,
  retries: 0,
  timeout: 90_000,
  reporter: [['line'], ['json', { outputFile: 'artifacts/production-validation/playwright-report.json' }]],
  use: {
    baseURL,
    trace: 'off',
    screenshot: 'off',
    video: 'off',
    ignoreHTTPSErrors: false,
  },
  projects: [
    { name: 'prod-desktop-chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'prod-mobile-chromium', use: { ...devices['Pixel 7'], viewport: { width: 393, height: 851 } } },
  ],
});
