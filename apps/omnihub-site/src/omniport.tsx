import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { OmniPortPage } from './pages/OmniPort';
import './styles/theme.css';
import './styles/components.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <OmniPortPage />
  </StrictMode>
);
