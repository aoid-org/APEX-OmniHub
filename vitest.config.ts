import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  plugins: [],
  test: {
    globals: true,
    environment: 'jsdom',
    include: [
      'tests/**/*.spec.ts',
      'tests/**/*.spec.tsx',
      'tests/**/*.test.ts',
      'tests/**/*.test.tsx',
      'sim/**/*.test.ts'
    ],
    // APEX-FIX: Enforce single-threading to eliminate 'ENOENT' coverage race conditions.
    // This prioritizes stability over parallel speed.
    poolOptions: {
      threads: {
        singleThread: true,
        isolate: false
      }
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      // APEX-FIX: Disable aggressive cleaning to prevent file contention during report generation.
      clean: false,
      cleanOnRerun: false
    },
    testTimeout: 30000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
