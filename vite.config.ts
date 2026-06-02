import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import { visualizer } from "rollup-plugin-visualizer";
import path from "node:path";


// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
  const supabasePublishableKey = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || '';

  const analyzeBundle = process.env.ANALYZE_BUNDLE === 'true';

  return ({
  server: {
    host: "::",
    port: 8080,
    // Proxy removed - app now writes directly to Supabase tables
    // Edge functions are still available but not required for client-side operations
    // Security: Enable CORS only for trusted origins in development
    cors: mode === 'development',
    // Security: Stricter headers in dev
    headers: {
      'X-Content-Type-Options': 'nosniff',
    },
  },
  plugins: [
    react(),
    // Visualizer is opt-in: set ANALYZE_BUNDLE=true to generate dist/stats.html
    // NEVER runs by default — avoids build overhead on Cloudflare Pages
    analyzeBundle && mode !== 'test' && visualizer({
      filename: 'dist/stats.html',
      gzipSize: true,
      brotliSize: true,
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "dashboard": path.resolve(__dirname, "./apps/omnihub-site/dashboard"),
      "@/dashboard": path.resolve(__dirname, "./apps/omnihub-site/dashboard"),
      "@omniconnect": path.resolve(__dirname, "./src/omniconnect"),
      "@": path.resolve(__dirname, "./apps/omnihub-site/src"),
    },
    // Dedupe React to prevent multiple instances (fixes createContext undefined)
    dedupe: ['react', 'react-dom'],
  },
  publicDir: "apps/omnihub-site/public",
  build: {
    // Production optimizations
    target: 'es2020',
    minify: mode === 'production' ? 'terser' : false,
    terserOptions: mode === 'production' ? {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug', 'console.trace'],
        passes: 2, // Multiple compression passes for better optimization
        dead_code: true,
        unused: true,
      },
      mangle: {
        safari10: true, // Safari 10 compatibility
      },
      format: {
        comments: false, // Remove all comments
      },
    } : undefined,
    rollupOptions: {
      // Keep Node-only packages out of the browser bundle entirely
      external: (id: string) => {
        return (
          id === 'ioredis' ||
          id === '@opentelemetry/sdk-node' ||
          id === '@opentelemetry/auto-instrumentations-node'
        );
      },
      // Suppress warnings for third-party package annotations that Rollup can't interpret
      onwarn(warning, warn) {
        // Ignore PURE comment warnings from node_modules (ox, wagmi, etc.)
        if (warning.code === 'INVALID_ANNOTATION' && warning.id?.includes('node_modules')) {
          return;
        }
        warn(warning);
      },
      output: {
        // Use function-based manualChunks to avoid empty chunks when modules are tree-shaken
        manualChunks(id) {
          // React vendor chunk
          if (id.includes('node_modules/react/') ||
              id.includes('node_modules/react-dom/') ||
              id.includes('node_modules/react-router-dom/') ||
              id.includes('node_modules/scheduler/')) {
            return 'react-vendor';
          }
          // Web3 core chunk
          if (id.includes('node_modules/viem/') ||
              id.includes('node_modules/wagmi/') ||
              id.includes('node_modules/@tanstack/react-query/')) {
            return 'web3-core';
          }
          // UI components chunk
          if (id.includes('node_modules/@radix-ui/')) {
            return 'ui-components';
          }
          // Supabase chunk - only create if module is actually included
          if (id.includes('node_modules/@supabase/')) {
            return 'supabase-vendor';
          }
          // Charts — only loaded on dashboard routes
          if (id.includes('node_modules/recharts/') ||
              id.includes('node_modules/reactflow/')) {
            return 'vendor-charts';
          }
          // Animations — separate chunk
          if (id.includes('node_modules/framer-motion/')) {
            return 'vendor-motion';
          }
          // i18n — separate chunk
          if (id.includes('node_modules/i18next/') ||
              id.includes('node_modules/react-i18next/')) {
            return 'vendor-i18n';
          }
        },
        // Optimize chunk file names with content hash for better caching
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
      },
      // Tree-shaking optimization - less aggressive to prevent empty chunks
      treeshake: {
        moduleSideEffects: true,
        propertyReadSideEffects: false,
      },
    },
    // Enable CSS code splitting
    cssCodeSplit: true,
    // Inline small assets (< 4KB) for fewer HTTP requests
    assetsInlineLimit: 4096,
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000,
    // Source maps: disabled for production (proprietary protection), enabled for dev
    sourcemap: mode !== 'production',
    // Report compressed size in build output
    reportCompressedSize: true,
    // CSS minification
    cssMinify: mode === 'production' ? 'esbuild' : false,
  },
  optimizeDeps: {
    include: [
      'react',
      'react/jsx-runtime',
      'react/jsx-dev-runtime',
      'react-dom',
      'react-dom/client',
      'react-router-dom',
      '@supabase/supabase-js',
      '@tanstack/react-query',
      'lucide-react',
      'clsx',
      'tailwind-merge',
    ],
    exclude: [
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      'ioredis',
      '@opentelemetry/sdk-node',
      '@opentelemetry/auto-instrumentations-node',
    ],
    holdUntilCrawlEnd: true,
  },
  // Preview server configuration (for testing production builds locally)
  preview: {
    port: 4173,
    host: true,
    strictPort: true,
  },
  // Environment variable prefix security
  envPrefix: 'VITE_',
  // Define globals for production
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '0.0.0'),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    // Expose only the public Supabase browser credentials; never expose service-role keys.
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(supabaseUrl),
    'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(supabaseAnonKey),
    'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': JSON.stringify(supabasePublishableKey),
    // Expose CI flag to client-side code for robust test detection
    'import.meta.env.VITE_IS_CI': JSON.stringify(process.env.CI || 'false'),
  },
  });
});
