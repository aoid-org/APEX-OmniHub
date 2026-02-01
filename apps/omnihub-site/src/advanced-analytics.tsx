import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AdvancedAnalyticsPage } from './pages/AdvancedAnalytics';
import './styles/theme.css';
import './styles/components.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AdvancedAnalyticsPage />
  </StrictMode>
);
