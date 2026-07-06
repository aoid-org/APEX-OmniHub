import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { OmniBoardPage } from './pages/OmniBoard';
import './styles/theme.css';
import './styles/components.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <OmniBoardPage />
  </StrictMode>
);
