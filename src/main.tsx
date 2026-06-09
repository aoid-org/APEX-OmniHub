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
