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

// Global unhandled rejection guard (prevents AuthApiError from blanking the screen)
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason?.name === 'AuthApiError' || (event.reason?.message && event.reason.message.includes('Refresh Token'))) {
    console.warn('[APEX Global] Suppressed AuthApiError unhandled rejection:', event.reason.message);
    event.preventDefault();
  }
});

registerServiceWorker();

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('APEX Critical Failure: DOM Root Not Found');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
);
