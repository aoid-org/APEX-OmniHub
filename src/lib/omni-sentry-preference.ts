import { initializeOmniSentry, shutdownOmniSentry } from './omni-sentry';

const STORAGE_KEY = 'omni_sentry_enabled';

/**
 * Check if OmniSentry is enabled via localStorage
 */
export function isOmniSentryEnabled(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * Set OmniSentry enabled state
 */
export function setOmniSentryEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(enabled));
    if (enabled) {
      initializeOmniSentry();
    } else {
      shutdownOmniSentry();
    }
  } catch {
    // Storage unavailable
  }
}

/**
 * Initialize OmniSentry based on stored preference
 * Call this once at app startup
 */
export function initializeFromPreference(): void {
  if (isOmniSentryEnabled()) {
    initializeOmniSentry();
  }
}
