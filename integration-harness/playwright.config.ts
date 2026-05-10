import { defineConfig } from '@playwright/test';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

export default defineConfig({
  testDir: './specs',
  timeout: 60_000,
  reporter: [['html', { outputFolder: 'playwright-report' }], ['list']],
  use: { screenshot: 'only-on-failure', trace: 'retain-on-failure', video: 'retain-on-failure' },
});
