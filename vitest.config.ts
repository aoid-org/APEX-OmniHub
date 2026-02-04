import { defineConfig } from 'vitest/config';
import path from 'node:path';

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
      provider: 'v8',
      reportsDirectory: './coverage',
      clean: true,
    },
  },
  // Fix coverage race condition in CI (Vitest 5+ style)
  poolOptions: {
    forks: {
      singleFork: true,
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
