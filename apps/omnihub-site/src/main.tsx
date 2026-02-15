import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './styles/globals.css';
import './styles/theme.css';
import './styles/components.css';

// Phase 1: Frontend Ignition Hardening
const rootElement = document.getElementById('root');

if (!rootElement) {
  // APEX FATAL ERROR TRAP
  console.error("🔴 FATAL: APEX-OmniHub Root Element Missing. Aborting Launch.");
  throw new Error("APEX Critical Failure: DOM Root Not Found");
}

createRoot(rootElement).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);
