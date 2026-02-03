import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
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
      // Playwright E2E tests (run separately with `npm run test:e2e`)
      'tests/e2e-playwright/**',
      '**/playwright/**',
      'e2e/**',
      'node_modules/**',
      // Skip Hardhat contract tests (run with `npm run hardhat:test`)
      'tests/contracts/**',
      // Skip integration tests in CI (require real Supabase infrastructure)
      ...(process.env.CI ? ['tests/integration/**'] : [])
    ],
    setupFiles: ['tests/setup.ts'],
    // Fix coverage race condition in CI - run tests sequentially for coverage
    // Vitest 4.x: poolOptions removed, options are now top-level
    pool: 'forks',
    maxWorkers: 1,
    isolate: false,
    // Prevent parallel file processing which causes coverage file race conditions
    fileParallelism: false,
    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage',
      clean: true,
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});

