/**
 * OmniHub PWA Controller
 * Handles aggressive auto-updates and service worker registration.
 * Isolated from React lifecycle to ensure idempotency.
 */
import { registerSW } from 'virtual:pwa-register';

// Polling interval for updates (60 minutes)
const UPDATE_INTERVAL_MS = 60 * 60 * 1000;

export function initPWA() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return; // Bail out in SSR or unsupported browsers
  }

  // Register the service worker and grab the update trigger
  // immediate: true executes the update immediately upon registration 
  // without asking the user to manually refresh.
  const updateSW = registerSW({
    immediate: true,
    onRegisterError(error) {
      console.error('[APEX PWA] Registration failed:', error);
    },
    onRegistered(r) {
      if (!r) return;

      // Aggressive Polling Logic
      // Periodically check the server for Sw.js byte-level changes.
      setInterval(() => {
        // Only attempt to check for updates if the device has a network connection
        if (navigator.onLine) {
          try {
            r.update().catch((e) => {
              console.error('[APEX PWA] Auto-update ping failed:', e);
            });
          } catch (e) {
            console.error('[APEX PWA] Sync error during update ping:', e);
          }
        }
      }, UPDATE_INTERVAL_MS);
    },
  });

  // Optional: exfiltrate updateSW if manual UI triggers are ever desired
  return updateSW;
}
