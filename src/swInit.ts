/**
 * registerServiceWorker — isolated so it can be unit-tested without mounting the app.
 * Called from src/main.tsx on startup.
 * APEX PWA INVARIANT: Do not inline this back into main.tsx.
 */
export function registerServiceWorker(): void {
  if (typeof globalThis.window === 'undefined' || !navigator.serviceWorker) return;
  globalThis.window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch((err) => {
      if (import.meta.env.DEV) console.warn('[APEX PWA] SW registration failed:', err);
    });
  });
}
