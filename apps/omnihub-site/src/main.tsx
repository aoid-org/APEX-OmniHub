import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './i18n';
import './styles/globals.css';
import './styles/theme.css';
import './styles/components.css';
import './styles/omnidash-layout.css';
import '../dashboard/omniSkin.css';
import { initPWA } from './pwa-init';

// Phase 1: Frontend Ignition Hardening & Service Worker Boot
const rootElement = document.getElementById('root');

if (!rootElement) {
  // APEX FATAL ERROR TRAP
  console.error("🔴 FATAL: APEX-OmniHub Root Element Missing. Aborting Launch.");
  throw new Error("APEX Critical Failure: DOM Root Not Found");
}

// Boot PWA layer idempotently
initPWA();

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
);
