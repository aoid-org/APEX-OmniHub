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
      '@omnihub': path.resolve(__dirname, './apps/omnihub-site/src'),
      'react': path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
      'framer-motion': path.resolve(__dirname, 'node_modules/framer-motion'),
    },
    dedupe: [
      'react',
      'react-dom',
      'react-router',
      'react-router-dom',
      'framer-motion',
      '@radix-ui/react-slot',
    ],
  },
});
