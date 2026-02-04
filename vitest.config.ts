import { defineConfig } from 'vitest/config';
import path from 'node:path';

// Detect CI environment to prevent coverage race condition (PR#410)
const isCI = process.env.CI === 'true' || !!process.env.GITHUB_ACTIONS;

export default defineConfig({
  plugins: [],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: [
      'tests/**/*.spec.ts',
      'tests/**/*.spec.tsx',
      'tests/**/*.test.ts',
      'tests/**/*.test.tsx',
      'sim/**/*.test.ts'
    ],
    coverage: {
      enabled: !isCI, // Disable coverage in CI to prevent ENOENT on coverage/.tmp (PR#410)
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
      clean: true,
    },
    testTimeout: 30000,
  },
  // @ts-ignore - Vitest v4 moved poolOptions to root level
  threads: {
    singleThread: true,
    isolate: false
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
