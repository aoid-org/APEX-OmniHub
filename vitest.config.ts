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
      'apex-resilience/tests/**/*.spec.ts',
      'packages/infrastructure/tests/**/*.test.ts'
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
      reporter: ['text', 'json', 'json-summary', 'html', 'lcov'],
      reportsDirectory: './coverage',
      clean: true,
      exclude: [
        'apex-resilience/**',
        '**/iron-law.spec.ts',
        '**/contracts/**',
        'tests/contracts/**',
        // Test-infrastructure helpers — not production source code.
        // Excluding them keeps coverage metrics focused on src/sim/packages.
        'tests/omnidash/_test-helpers.ts',
        'tests/triforce/helpers/**',
        'tests/triforce/__helpers__/**',
        'tests/worldwide-wildcard/runner/**',
        'tests/integration/setup-helpers.ts',
        // Asset files — binaries have no executable lines.
        '**/*.png',
        '**/*.jpg',
        '**/*.jpeg',
        '**/*.gif',
        '**/*.svg',
        '**/*.ico',
        // External-service provider implementations require live connections to test.
        // Unit tests mock the IDatabase/IStorage interfaces; these concrete wrappers
        // are integration-tested in the orchestrator's pytest suite, not vitest.
        'src/lib/database/providers/**',
        'src/lib/storage/providers/**',
        'src/lib/realtime/**',
        'src/lib/media/**',
        // Supabase auto-generated types and client bootstrap — no testable logic.
        'src/integrations/supabase/**',
        'src/integrations/omniport/**',
        // Web3/blockchain entitlements — tested via hardhat, not vitest.
        'src/lib/web3/**',
        // OmniHub Gateway — requires live Temporal cluster + infrastructure.
        // Integration-tested via orchestrator pytest suite, not vitest.
        'src/omnihub-gateway/**',
        // Infrastructure package — CDK stacks and Lambda workers require AWS.
        'packages/infrastructure/src/stack.ts',
        'packages/infrastructure/src/worker.ts',
        // Exclude UI/React components to focus vitest coverage purely on Iron Core
        'src/components/**',
        'src/contexts/**',
        'src/hooks/**',
        'src/utils/RealtimeAudio.ts', // Relies on browser WebAudio primitives
        'apps/omnihub-site/**',
        'node_modules/**',
        'dist/**',
        '.idea/**',
        '.git/**',
        '.cache/**'
      ],
      // Coverage thresholds — recalibrated to measured actuals (2026-03-21).
      // Stmts: 69.80%, Branch: 61.68%, Funcs: 71.59%, Lines: 70.81%
      // North-star target: 80% (SonarCloud quality gate).
      thresholds: {
        statements: 69,
        branches: 60,
        functions: 71,
        lines: 70,
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
      'zustand',
    ],
  },
});
