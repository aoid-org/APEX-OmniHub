import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HomePage } from './pages/Home';
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
    <HomePage />
  </StrictMode>
);
