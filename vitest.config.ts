import { defineConfig } from 'vitest/config';
import path from 'node:path';

// Detect CI environment to prevent coverage race condition (PR#413)
const isCI = process.env.CI === 'true' || !!process.env.GITHUB_ACTIONS;

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['tests/setup/vitest.setup.ts'],
    include: [
      'tests/**/*.spec.ts',
      'tests/**/*.spec.tsx',
      'tests/**/*.test.ts',
      'tests/**/*.test.tsx',
      'sim/tests/**/*.test.ts',
      'sim/tests/**/*.spec.ts',
      'apex-resilience/tests/**/*.spec.ts',
      'apex-resilience/tests/**/*.test.ts'
    ],
    exclude: [
      // Explicitly ignore Playwright
      '**/playwright/**',
      '**/e2e-playwright/**',
      'tests/e2e-playwright/**',
      'tests/worldwide-wildcard/playwright/**',
      
      // Explicitly ignore Hardhat
      '**/contracts/**',
      'tests/contracts/**',

      'node_modules/**',
      'dist/**',
      '.idea/**',
      '.git/**',
      '.cache/**',
      
      // Skip integration tests in CI (require real Supabase infrastructure)
      ...(process.env.CI ? ['tests/integration/**'] : [])
    ],
    // Fix coverage race condition in CI
    pool: 'forks',
    coverage: {
      enabled: !isCI, // Disable coverage in CI to prevent ENOENT on coverage/.tmp (PR#413)
      provider: 'v8',
      reportsDirectory: './coverage',
      clean: true,
      exclude: [
        'apex-resilience/**',
        '**/iron-law.spec.ts',
        '**/contracts/**',
        'tests/contracts/**',
        'node_modules/**',
        'dist/**',
        '.idea/**',
        '.git/**',
        '.cache/**'
      ]
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
