import { defineConfig, devices } from '@playwright/test';

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

const ciProjects = allProjects.filter((p) =>
  ['chromium', 'mobile-chrome'].includes(p.name),
);

export default defineConfig({
  testDir: './tests/e2e-playwright',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,
  reporter: 'html',

  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },

  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:4173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: isCI ? ciProjects : allProjects,

  webServer: process.env.BASE_URL ? undefined : {
    command: 'VITE_ENABLE_DEMO_AUTH=true VITE_DEMO_MODE=true npm run build && VITE_ENABLE_DEMO_AUTH=true VITE_DEMO_MODE=true npm run preview',
    url: 'http://localhost:4173',
    reuseExistingServer: true,
    timeout: 300_000,
  },
});
