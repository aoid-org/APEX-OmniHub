import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import '../apps/omnihub-site/src/i18n';
import '../apps/omnihub-site/src/styles/globals.css';
import '../apps/omnihub-site/src/styles/theme.css';
import '../apps/omnihub-site/src/styles/components.css';
import '../apps/omnihub-site/src/styles/omnidash-layout.css';

// APEX PWA INVARIANT: Service worker MUST be registered for beforeinstallprompt
// to fire and the PWA install banner to appear. Never remove this block.
// Guarded by: scripts/ci/check-pwa-integrity.mjs
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch((err) => {
      // Non-fatal — site works without SW, install banner simply won't appear
      if (import.meta.env.DEV) console.warn('[APEX PWA] SW registration failed:', err);
    });
  });
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
