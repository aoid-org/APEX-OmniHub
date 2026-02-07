import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "node:path";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    cors: mode === 'development',
    headers: {
      'X-Content-Type-Options': 'nosniff',
    },
  },
  plugins: [
    react()
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@apex/ui": path.resolve(__dirname, "../../packages/ui/src"),
      "@apex/types": path.resolve(__dirname, "../../packages/types/src"),
    },
    dedupe: ['react', 'react-dom'],
  },
  build: {
    target: 'es2020',
    minify: mode === 'production' ? 'terser' : false,
    terserOptions: mode === 'production' ? {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug', 'console.trace'],
        passes: 2,
        dead_code: true,
        unused: true,
      },
      mangle: {
        safari10: true,
      },
      format: {
        comments: false,
      },
    } : undefined,
    rollupOptions: {
      onwarn(warning, warn) {
        if (warning.code === 'INVALID_ANNOTATION' && warning.id?.includes('node_modules')) {
          return;
        }
        warn(warning);
      },
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react/') ||
              id.includes('node_modules/react-dom/') ||
              id.includes('node_modules/react-router-dom/') ||
              id.includes('node_modules/scheduler/')) {
            return 'react-vendor';
          }
          if (id.includes('node_modules/viem/') ||
              id.includes('node_modules/wagmi/') ||
              id.includes('node_modules/@tanstack/react-query/')) {
            return 'web3-core';
          }
          if (id.includes('node_modules/@radix-ui/')) {
            return 'ui-components';
          }
          if (id.includes('node_modules/@supabase/')) {
            return 'supabase-vendor';
          }
        },
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
      },
      treeshake: {
        moduleSideEffects: true,
        propertyReadSideEffects: false,
      },
    },
    cssCodeSplit: true,
    assetsInlineLimit: 4096,
    chunkSizeWarningLimit: 1000,
    sourcemap: mode !== 'production',
    reportCompressedSize: true,
    cssMinify: mode === 'production' ? 'esbuild' : false,
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@supabase/supabase-js',
      '@tanstack/react-query',
      'lucide-react',
      'clsx',
      'tailwind-merge',
    ],
    exclude: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
    holdUntilCrawlEnd: false,
  },
  preview: {
    port: 4173,
    host: true,
    strictPort: true,
  },
  envPrefix: 'VITE_',
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '0.0.0'),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
}));
