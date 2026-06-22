import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import '../apps/omnihub-site/src/i18n';
import '../apps/omnihub-site/src/styles/globals.css';
import '../apps/omnihub-site/src/styles/theme.css';
import '../apps/omnihub-site/src/styles/components.css';
import '../apps/omnihub-site/src/styles/omnidash-layout.css';
// APEX PWA INVARIANT: SW registration lives in swInit.ts (testable).
// Guarded by: scripts/ci/check-pwa-integrity.mjs
import { registerServiceWorker } from './swInit';
import { initializeOmniSentry } from './lib/omni-sentry';

registerServiceWorker();

// Activate the OmniSentry self-healing monitor when the user has enabled it.
// Preference is owned by the OmniSentry surface (/omni-sentry) via this key.
try {
  if (localStorage.getItem('omni_sentry_enabled') === 'true') {
    initializeOmniSentry();
  }
} catch {
  // Storage unavailable — monitor stays dormant until explicitly enabled.
}

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('APEX Critical Failure: DOM Root Not Found');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
);
