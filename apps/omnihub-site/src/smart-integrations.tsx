import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { SmartIntegrationsPage } from './pages/SmartIntegrations';
import './styles/theme.css';
import './styles/components.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SmartIntegrationsPage />
  </StrictMode>
);
