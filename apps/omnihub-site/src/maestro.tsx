import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MaestroPage } from './pages/Maestro';
import './styles/theme.css';
import './styles/components.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MaestroPage />
  </StrictMode>
);
