import { defineConfig } from 'vitest/config';
import path from 'node:path';

// Detect CI environment to prevent coverage race condition (PR#410/413)
const isCI = process.env.CI === 'true' || !!process.env.GITHUB_ACTIONS;

export default defineConfig({
  plugins: [],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    pool: 'forks', // Fix coverage race condition in CI
    include: [
      'tests/**/*.spec.ts',
      'tests/**/*.spec.tsx',
      'tests/**/*.test.ts',
      'tests/**/*.test.tsx',
      'sim/**/*.test.ts',
      'apex-resilience/tests/**/*.spec.ts'
    ],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/cypress/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build,eslint,prettier}.config.*',
      
      // Explicitly ignore Playwright
      '**/playwright/**',
      '**/e2e-playwright/**',
      './tests/e2e-playwright/**',
      'tests/e2e-playwright/**',
      './tests/worldwide-wildcard/playwright/**',
      'tests/worldwide-wildcard/playwright/**',
      
      // Explicitly ignore Hardhat
      '**/contracts/**',
      './tests/contracts/**',
      'tests/contracts/**',

      // Skip integration tests in CI (redundant with in-test logic but safer)
      ...(process.env.CI ? ['tests/integration/**', './tests/integration/**'] : [])
    ],
    coverage: {
      enabled: !isCI, // Disable coverage in CI to prevent ENOENT on coverage/.tmp (PR#410/413)
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
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
    testTimeout: 30000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
