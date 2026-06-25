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
        // OmniHub Gateway — mostly integration-tested via orchestrator pytest suite.
        // Tracer.ts and TemporalBridge.ts have unit tests; exclude everything else.
        // (micromatch.isMatch doesn't honour negation overrides in an exclude array,
        //  so list each excluded file explicitly rather than using a blanket glob + negation.)
        'src/omnihub-gateway/AgentCard.ts',
        'src/omnihub-gateway/IdempotencyManager.ts',
        'src/omnihub-gateway/JsonRpcHandler.ts',
        'src/omnihub-gateway/SSEManager.ts',
        'src/omnihub-gateway/SemanticRouter.ts',
        'src/omnihub-gateway/SupabaseIdempotencyStore.ts',
        'src/omnihub-gateway/TokenEconomicsRouter.ts',
        'src/omnihub-gateway/index.ts',
        'src/omnihub-gateway/lambdaDispatchActivity.ts',
        'src/omnihub-gateway/mcp-client.ts',
        'src/omnihub-gateway/middleware/**',
        'src/omnihub-gateway/router.ts',
        'src/omnihub-gateway/types.ts',
        // Infrastructure package — CDK stacks and Lambda workers require AWS.
        'packages/infrastructure/src/stack.ts',
        'packages/infrastructure/src/worker.ts',
        // ─── COVERAGE INTEGRITY INVARIANTS (vitest 4) ─────────────────────
        // 1. NEVER add negation patterns ('!path') to this exclude array.
        //    Vitest 4's v8 provider silently produces a COMPLETELY EMPTY
        //    coverage report (0 files in lcov.info) when any negation is
        //    present — thresholds then pass vacuously and SonarCloud reads
        //    0.0% on all new code. Verified empirically 2026-06-09.
        // 2. Patterns here match UNANCHORED (suffix-style): 'src/hooks/**'
        //    also excludes 'apps/omnihub-site/src/hooks/**'. To exclude a
        //    root dir without hiding the site app's twin dir, enumerate
        //    files explicitly (see the omnihub-gateway block above).
        // Guarded by: scripts/ci/check-coverage-integrity.mjs
        // ──────────────────────────────────────────────────────────────────
        // Exclude UI/React contexts to focus vitest coverage purely on Iron Core
        'src/contexts/**',
        'src/utils/RealtimeAudio.ts', // Relies on browser WebAudio primitives
        // Site app surfaces without dedicated unit tests (dashboard shell is
        // integration-tested via tests/omnidash with mocked internals).
        'apps/omnihub-site/dashboard/**',
        'apps/omnihub-site/src/App.tsx',
        'apps/omnihub-site/src/main.tsx',
        'apps/omnihub-site/src/pwa-init.ts',
        'apps/omnihub-site/src/pages/**',
        'apps/omnihub-site/src/components/OmniHubPlatformMap.tsx',
        'apps/omnihub-site/src/providers/**',
        'apps/omnihub-site/src/layouts/**',
        'node_modules/**',
        'dist/**',
        '.idea/**',
        '.git/**',
        '.cache/**'
      ],
      // Coverage thresholds — raised 2026-05-20 from measured actuals (2026-03-21).
      // Actuals: Stmts 69.80%, Branch 61.68%, Funcs 71.59%, Lines 70.81%
      // North-star target: 80% (SonarCloud quality gate). Next milestone: 75% branches.
      // Increase incrementally as focused tests are added to src/core/,
      // src/omniconnect/, and src/omnihub-gateway/ conditional paths.
      thresholds: {
        statements: 70,
        branches: 63,
        functions: 72,
        lines: 71,
      },
    },
    testTimeout: 30000,
  },
  resolve: {
    alias: {
      // INTENTIONAL SPLIT: '@' here resolves to ./src (root package code) while
      // vite.config.ts and tsconfig.json resolve '@' to ./apps/omnihub-site/src.
      // Tests under tests/ import root-package modules via '@/'; the app imports
      // omnihub-site modules via '@/'. Do NOT align these — the split is load-bearing.
      'dashboard': path.resolve(__dirname, './apps/omnihub-site/dashboard'),
      '@/dashboard': path.resolve(__dirname, './apps/omnihub-site/dashboard'),
      // Pin the sidebar-widgets contract specifier to the root-package STUB so the vi.mock in
      // omnidash-shell-coverage resolves deterministically under vitest, regardless of any Vite
      // plugin import-analysis pass that would otherwise resolve '@' via vite.config (apps/…/src).
      '@/contracts/omnidash-sidebar-widgets': path.resolve(__dirname, './apps/omnihub-site/src/contracts/omnidash-sidebar-widgets.ts'),
      '@': path.resolve(__dirname, './src'),
      '@omnihub': path.resolve(__dirname, './apps/omnihub-site/src'),
      'recharts': path.resolve(__dirname, 'tests/__mocks__/recharts.tsx'),
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
