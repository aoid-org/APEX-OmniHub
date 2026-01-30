import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { OrchestratorPage } from './pages/Orchestrator';
import './styles/theme.css';
import './styles/components.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <OrchestratorPage />
  </StrictMode>
);
