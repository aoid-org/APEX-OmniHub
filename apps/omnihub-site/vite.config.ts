/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { resolve } from 'node:path';

// PWA Configuration
import { VitePWA } from 'vite-plugin-pwa';

// Single-page application configuration
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['icon.png'],
      manifest: {
        name: 'APEX OmniHub',
        short_name: 'OmniHub',
        description: 'APEX OmniHub - Intelligence, Designed.',
        theme_color: '#0f1729',
        background_color: '#0f1729',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        orientation: 'portrait',
        icons: [
          {
            src: 'icon.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 3000000,
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // <== 365 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@/dashboard': resolve(__dirname, './dashboard'),
      '@/lib/omni-sentry': resolve(__dirname, '../../src/lib/omni-sentry.ts'),
      '@omniconnect': resolve(__dirname, '../../src/omniconnect'),
      '@': resolve(__dirname, './src'),
      'react-router-dom/server.js': 'react-router',
      'react-i18next': resolve(__dirname, '../../node_modules/react-i18next'),
      'i18next': resolve(__dirname, '../../node_modules/i18next'),
    },
    dedupe: ['react', 'react-dom', 'react-router-dom', 'react-router', 'react-i18next', 'i18next'],
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      // Input defaults to index.html in SPA mode
      output: {
        // Consistent asset naming for caching
        assetFileNames: 'assets/[name]-[hash][extname]',
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
      },
    },
    // Performance optimizations
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
      },
    },
    // Enable source maps for debugging in production (hidden)
    sourcemap: 'hidden',
    // CSS code splitting
    cssCodeSplit: true,
  },
  envDir: resolve(__dirname, '../../'),
  server: {
    port: 3000,
    strictPort: true,
  },
  preview: {
    port: 3000,
    strictPort: true,
  },
  ssgOptions: {
    entry: './src/main-ssg.tsx',
    script: 'async',
    formatting: 'minify',
    includedRoutes(paths: string[]) {
      // Pre-auth marketing routes only — post-auth SPA routes stay CSR
      return paths.filter(
        (p) => !p.startsWith('/omnidash') && !p.startsWith('/dashboard')
      );
    },
  },
  ssr: {
    // Keep React external in the SSG bundle so react-dom/server and the bundle
    // share the same React instance (avoids invalid hook dispatcher errors).
    external: ['react', 'react-dom'],
  },
  // @ts-expect-error test is an extension provided by vitest
  test: {
    // Only pick up unit/integration tests — exclude Playwright E2E specs.
    // Playwright tests must be run with: npx playwright test
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx', 'tests/lib/**/*.spec.ts'],
    exclude: [
      'tests/visual/**',
      'tests/routes/**',
      'tests/visual/**/*.spec.ts',
      'node_modules/**',
    ],
    // Node environment required for tests that use readFileSync
    environment: 'node',
    coverage: {
      reporter: ['text', 'lcov'],
      reportsDirectory: './coverage',
    },
  },
});
