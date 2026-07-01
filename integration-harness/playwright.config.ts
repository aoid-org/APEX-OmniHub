import { defineConfig } from '@playwright/test';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

export default defineConfig({
  testDir: './specs',
  timeout: 60_000,
  reporter: [['html', { outputFolder: 'playwright-report' }], ['list']],
  use: {
    // Use the runner's preinstalled Google Chrome to avoid downloading the
    // bundled Playwright Chromium binary on CI (~170 MiB, stalls during
    // zip extraction on GitHub-hosted runners after download completes).
    // Mirrors the strategy already in ci-runtime-gates.yml.
    // Local dev fallback: set PLAYWRIGHT_CHANNEL='' to use bundled chromium.
    channel: process.env.PLAYWRIGHT_CHANNEL === '' ? undefined : 'chrome',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },
});
