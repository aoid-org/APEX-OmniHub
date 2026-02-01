import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AiAutomationPage } from './pages/AiAutomation';
import './styles/theme.css';
import './styles/components.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AiAutomationPage />
  </StrictMode>
);
