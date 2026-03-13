import { defineConfig } from 'vitest/config';
import path from 'node:path';

// Coverage is opt-in only via `npm run test:coverage`.
// Default `npm test` / `vitest run` disables coverage to prevent ENOENT
// on coverage/.tmp race condition (PR#410/413).
const enableCoverage = process.env.VITEST_COVERAGE === 'true';

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
      'e2e/**',
      'apps/omnihub-site/tests/**',

      // Explicitly ignore Hardhat
      '**/contracts/**',
      './tests/contracts/**',
      'tests/contracts/**',

      // Skip integration tests in CI (redundant with in-test logic but safer)
      ...(process.env.CI ? ['tests/integration/**', './tests/integration/**'] : [])
    ],
    coverage: {
      enabled: enableCoverage,
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
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
      ],
      // Coverage thresholds — set at the current baseline to prevent regression.
      // Current actuals: statements 60.96 %, branches 51.85 %, functions 59.32 %, lines 62.06 %.
      // Raise these values incrementally as new tests are added.
      // North-star target: 80 % across all metrics (SonarCloud quality gate).
      thresholds: {
        statements: 59,
        branches: 50,
        functions: 57,
        lines: 60,
      },
    },
    testTimeout: 30000,
  },
  resolve: {
    alias: {
      'dashboard': path.resolve(__dirname, './apps/omnihub-site/dashboard'),
      '@/dashboard': path.resolve(__dirname, './apps/omnihub-site/dashboard'),
      '@': path.resolve(__dirname, './src'),
      '@omnihub': path.resolve(__dirname, './apps/omnihub-site/src'),
      'react': path.resolve(__dirname, 'node_modules/react'),
      'react/jsx-runtime': path.resolve(__dirname, 'node_modules/react/jsx-runtime'),
      'react/jsx-dev-runtime': path.resolve(__dirname, 'node_modules/react/jsx-dev-runtime'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
      'react-dom/client': path.resolve(__dirname, 'node_modules/react-dom/client'),
      'framer-motion': path.resolve(__dirname, 'node_modules/framer-motion'),
      // Force site-scoped packages to use root node_modules (React 18) in tests
      // Prevents CJS require('react') in site node_modules from loading React 19
      'lucide-react': path.resolve(__dirname, 'node_modules/lucide-react'),
    },
    dedupe: [
      'react',
      'react-dom',
      'lucide-react',
      'react-router',
      'react-router-dom',
      'framer-motion',
      '@radix-ui/react-slot',
    ],
  },
});
