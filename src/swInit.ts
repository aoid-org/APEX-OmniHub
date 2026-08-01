/**
 * registerServiceWorker — isolated so it can be unit-tested without mounting the app.
 * Called from src/main.tsx on startup.
 * APEX PWA INVARIANT: Do not inline this back into main.tsx.
 *
 * Error handling contract:
 *   - In DEV mode  : log a console.warn so developers see the failure immediately.
 *   - In PROD mode : swallow silently — SW registration failures are non-fatal and
 *     should not pollute the production console or trigger error-monitoring noise.
 *   - Automatic Cache Purge: Instructs existing SW to skip waiting and update to v5.
 */
export function registerServiceWorker(): void {
  if (globalThis.window === undefined || !navigator.serviceWorker) return;
  globalThis.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).then((reg) => {
      // Force update check to ensure users don't remain stuck on stale v4 service worker
      reg.update().catch(() => {});
      if (reg.waiting) {
        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
    }).catch((err) => {
      if (import.meta.env.DEV) {
        console.warn('[APEX PWA] SW registration failed:', err);
      }
    });
  });
}
