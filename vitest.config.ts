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
<<<<<<< HEAD
      // Explicitly ignore Playwright
=======
      '**/node_modules/**',
      '**/dist/**',
      '**/cypress/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build,eslint,prettier}.config.*',
      
      
      // Explicitly ignore Playwright (HEAD + Main)
>>>>>>> 44fb2513 (chore(ci): enforce python quality, fix docs drift, and add sonar gate)
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

<<<<<<< HEAD
      'node_modules/**',
      'dist/**',
      '.idea/**',
      '.git/**',
      '.cache/**',
      
      // Skip integration tests in CI (require real Supabase infrastructure)
      ...(process.env.CI ? ['tests/integration/**'] : [])
=======
      // Skip integration tests in CI (redundant with in-test logic but safer)
      ...(process.env.CI ? ['tests/integration/**', './tests/integration/**'] : [])
>>>>>>> 44fb2513 (chore(ci): enforce python quality, fix docs drift, and add sonar gate)
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
